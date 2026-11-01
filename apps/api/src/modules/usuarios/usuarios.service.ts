import { randomBytes } from 'node:crypto';
import type { Usuario } from '@prisma/client';
import type { ConfiguracionEnvioInput, UsuarioPublico } from '@ep/shared';
import { AppError } from '../../errors/AppError';
import { almacenamiento } from '../../lib/almacenamiento';
import { crearClienteOAuth } from '../../lib/googleOAuth';
import { descifrarToken } from '../../lib/tokens';
import { esPdf } from '../../middlewares/uploadPdf';
import { usuariosRepository } from './usuarios.repository';

const SCOPE_GMAIL_SEND = 'https://www.googleapis.com/auth/gmail.send';

export function aPublico(u: Usuario): UsuarioPublico {
  return {
    id: u.id,
    nombre: u.nombre,
    correo: u.correo,
    programaFormacion: u.programaFormacion,
    ficha: u.ficha,
    telefono: u.telefono,
    hojaVida: u.hojaVidaRuta && u.hojaVidaNombre ? { nombre: u.hojaVidaNombre, bytes: u.hojaVidaBytes ?? 0 } : null,
    limiteDiario: u.limiteDiario,
    espaciadoMinSeg: u.espaciadoMinSeg,
    espaciadoMaxSeg: u.espaciadoMaxSeg,
    diasSeguimiento: u.diasSeguimiento,
    autorizacionDatosEn: u.autorizacionDatosEn?.toISOString() ?? null,
    requiereReconexion: u.requiereReconexion,
    permisoEnvio: (u.scopes ?? '').split(' ').includes(SCOPE_GMAIL_SEND),
  };
}

async function obtener(id: string): Promise<Usuario> {
  const usuario = await usuariosRepository.buscarPorId(id);
  if (!usuario) throw AppError.noAutenticado('Tu cuenta ya no existe. Inicia sesión de nuevo.');
  return usuario;
}

/** Deja solo caracteres seguros para la cabecera Content-Disposition y el adjunto de Gmail. */
function limpiarNombreArchivo(nombre: string): string {
  const base = nombre.replace(/\.pdf$/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const limpio = base.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 80);
  return `${limpio || 'hoja_de_vida'}.pdf`;
}

export const usuariosService = {
  obtener,

  async perfil(id: string) {
    return aPublico(await obtener(id));
  },

  async actualizarPerfil(
    id: string,
    datos: { nombre: string; programaFormacion?: string | null; ficha?: string | null; telefono?: string | null },
  ) {
    return aPublico(await usuariosRepository.actualizar(id, datos));
  },

  async actualizarConfiguracion(id: string, datos: ConfiguracionEnvioInput) {
    return aPublico(await usuariosRepository.actualizar(id, datos));
  },

  async aceptarAutorizacionDatos(id: string) {
    return aPublico(await usuariosRepository.actualizar(id, { autorizacionDatosEn: new Date() }));
  },

  async guardarHojaVida(id: string, archivo: Express.Multer.File | undefined) {
    if (!archivo) throw AppError.solicitudInvalida('Adjunta un archivo PDF en el campo "archivo"');
    if (!esPdf(archivo.buffer)) throw AppError.solicitudInvalida('El archivo no es un PDF válido');

    const usuario = await obtener(id);
    const clave = `hojas-vida/${id}/${randomBytes(8).toString('hex')}.pdf`;
    await almacenamiento.guardar(clave, archivo.buffer);

    const actualizado = await usuariosRepository.actualizar(id, {
      hojaVidaRuta: clave,
      hojaVidaNombre: limpiarNombreArchivo(archivo.originalname),
      hojaVidaBytes: archivo.size,
    });
    if (usuario.hojaVidaRuta) await almacenamiento.eliminar(usuario.hojaVidaRuta);
    return aPublico(actualizado);
  },

  async hojaVida(id: string) {
    const usuario = await obtener(id);
    if (!usuario.hojaVidaRuta || !usuario.hojaVidaNombre) throw AppError.noEncontrado('Aún no has subido tu hoja de vida');
    return { nombre: usuario.hojaVidaNombre, stream: almacenamiento.abrirStream(usuario.hojaVidaRuta) };
  },

  async eliminarHojaVida(id: string) {
    const usuario = await obtener(id);
    if (usuario.hojaVidaRuta) await almacenamiento.eliminar(usuario.hojaVidaRuta);
    return aPublico(
      await usuariosRepository.actualizar(id, { hojaVidaRuta: null, hojaVidaNombre: null, hojaVidaBytes: null }),
    );
  },

  /**
   * Derecho de supresión (Ley 1581): revoca el acceso a Gmail, borra la hoja de vida
   * y elimina el usuario con todas sus empresas, plantillas y envíos (cascada).
   */
  async eliminarCuenta(id: string) {
    const usuario = await obtener(id);

    if (usuario.refreshTokenCifrado) {
      try {
        await crearClienteOAuth().revokeToken(descifrarToken(usuario.refreshTokenCifrado));
      } catch (err) {
        // Si el token ya estaba revocado no hay nada que hacer; seguimos con el borrado.
        console.warn('No se pudo revocar el token de Google:', (err as Error).message);
      }
    }
    if (usuario.hojaVidaRuta) await almacenamiento.eliminar(usuario.hojaVidaRuta);
    await usuariosRepository.eliminar(id);
  },
};
