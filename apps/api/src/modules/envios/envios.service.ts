import type { EstadoContacto } from '@prisma/client';
import {
  DESCRIPCION_VARIABLES,
  renderizarPlantilla,
  type Envio,
  type PlantillaDatos,
  type ResultadoEncolar,
  type ResumenEnvios,
} from '@ep/shared';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { clasificarErrorGmail } from '../../errors/gmailErrors';
import { almacenamiento } from '../../lib/almacenamiento';
import { obtenerEnviador } from '../../lib/gmail';
import { construirMime } from '../../lib/mime';
import { prisma } from '../../lib/prisma';
import { plantillasRepository } from '../plantillas/plantillas.repository';
import { aPublico, usuariosService } from '../usuarios/usuarios.service';
import { enviosRepository, ESTADOS_BLOQUEADOS, type EnvioConRelaciones } from './envios.repository';
import { planificarHorarios } from './planificador';

export function aEnvioPublico(e: EnvioConRelaciones): Envio {
  return {
    id: e.id,
    empresa: e.empresa,
    plantillaNombre: e.plantilla?.nombre ?? null,
    destinatario: e.destinatario,
    asunto: e.asunto,
    cuerpo: e.cuerpo,
    estado: e.estado,
    fechaProgramada: e.fechaProgramada.toISOString(),
    fechaEnvio: e.fechaEnvio?.toISOString() ?? null,
    intentos: e.intentos,
    ultimoError: e.ultimoError,
    fechaProximoSeguimiento: e.fechaProximoSeguimiento?.toISOString() ?? null,
  };
}

const MOTIVO_OMISION: Partial<Record<EstadoContacto, string>> = {
  NO_CONTACTAR: 'Pidió no ser contactada',
  RECHAZADO: 'Rechazó tu solicitud',
  PENDIENTE: 'Ya tiene un correo en cola',
  RESPONDIO: 'Ya te respondió',
};

async function exigirUsuarioListo(usuarioId: string) {
  const usuario = await usuariosService.obtener(usuarioId);
  const publico = aPublico(usuario);
  if (!publico.autorizacionDatosEn) {
    throw new AppError(403, 'SIN_AUTORIZACION', 'Debes aceptar la autorización de tratamiento de datos');
  }
  if (publico.requiereReconexion || !publico.permisoEnvio) {
    throw new AppError(400, 'RECONECTAR_GMAIL', 'Vuelve a conectar tu cuenta de Google para poder enviar correos');
  }
  if (!usuario.hojaVidaRuta) {
    throw new AppError(400, 'SIN_HOJA_VIDA', 'Sube tu hoja de vida en PDF antes de enviar correos');
  }
  return usuario;
}

/** Envía en el siguiente horario libre del usuario, respetando su límite y espaciado. */
async function siguienteHorario(usuarioId: string, cantidad: number, ahora: Date) {
  const usuario = await usuariosService.obtener(usuarioId);
  const { ocupacion, ultimo } = await enviosRepository.ocupacion(usuarioId, ahora);
  return planificarHorarios(cantidad, {
    ahora,
    ultimo,
    ocupacion,
    limiteDiario: usuario.limiteDiario,
    espaciadoMinSeg: usuario.espaciadoMinSeg,
    espaciadoMaxSeg: usuario.espaciadoMaxSeg,
  });
}

export const enviosService = {
  siguienteHorario,

  /**
   * Envía de inmediato un correo de prueba al propio aprendiz, sin pasar por la cola,
   * para que vea cómo llega (formato, tildes, adjunto). La empresa es de ejemplo.
   */
  async enviarPrueba(usuarioId: string, plantilla: Pick<PlantillaDatos, 'asunto' | 'cuerpo' | 'incluirLineaExclusion'>) {
    const usuario = await exigirUsuarioListo(usuarioId);
    const correo = renderizarPlantilla(plantilla, {
      empresa: 'Empresa de Ejemplo S.A.S.',
      nombre: usuario.nombre,
      programa: usuario.programaFormacion,
      ficha: usuario.ficha,
      telefono: usuario.telefono,
    });
    if (correo.faltantes.length > 0) {
      throw new AppError(
        400,
        'PERFIL_INCOMPLETO',
        `Completa en tu perfil: ${correo.faltantes.map((v) => DESCRIPCION_VARIABLES[v].toLowerCase()).join(', ')}`,
      );
    }

    const mime = construirMime({
      de: { nombre: usuario.nombre, correo: usuario.correo },
      para: usuario.correo,
      asunto: `[Prueba] ${correo.asunto}`,
      cuerpo: correo.cuerpo,
      adjunto: {
        nombre: usuario.hojaVidaNombre ?? 'hoja_de_vida.pdf',
        tipo: 'application/pdf',
        contenido: await almacenamiento.leer(usuario.hojaVidaRuta!),
      },
    });

    try {
      await obtenerEnviador()(usuario, mime);
    } catch (err) {
      const { tipo, mensaje } = clasificarErrorGmail(err);
      console.warn(`[prueba] falló (${tipo}):`, err);
      if (tipo === 'reconectar') {
        await prisma.usuario.update({ where: { id: usuarioId }, data: { requiereReconexion: true } });
      }
      throw new AppError(502, 'ERROR_GMAIL', mensaje);
    }
    return { enviadoA: usuario.correo, simulado: env.GMAIL_MODO === 'simulado' };
  },

  async encolar(
    usuarioId: string,
    datos: { empresaIds: string[]; plantillaId: string; reenviar: boolean },
    ahora = new Date(),
  ): Promise<ResultadoEncolar> {
    const usuario = await exigirUsuarioListo(usuarioId);

    const plantilla = await plantillasRepository.buscar(usuarioId, datos.plantillaId);
    if (!plantilla) throw AppError.noEncontrado('La plantilla no existe');

    const empresas = await prisma.empresa.findMany({
      where: { usuarioId, id: { in: [...new Set(datos.empresaIds)] } },
      orderBy: { nombre: 'asc' },
    });

    const omitidos: ResultadoEncolar['omitidos'] = [];
    const aptas = empresas.filter((e) => {
      const motivo =
        MOTIVO_OMISION[e.estado] ??
        (e.estado === 'ENVIADO' && !datos.reenviar ? 'Ya le enviaste un correo (activa «Reenviar» para hacer seguimiento)' : null);
      if (motivo) omitidos.push({ empresaId: e.id, nombre: e.nombre, motivo });
      return !motivo;
    });

    const valoresUsuario = {
      nombre: usuario.nombre,
      programa: usuario.programaFormacion,
      ficha: usuario.ficha,
      telefono: usuario.telefono,
    };
    const correos = aptas.map((e) => ({ empresa: e, ...renderizarPlantilla(plantilla, { ...valoresUsuario, empresa: e.nombre }) }));

    // Si falta un dato del perfil, faltaría en todos los correos: mejor detener todo el lote.
    const faltantes = [...new Set(correos.flatMap((c) => c.faltantes))];
    if (faltantes.length > 0) {
      throw new AppError(
        400,
        'PERFIL_INCOMPLETO',
        `La plantilla usa datos que no tienes en tu perfil: ${faltantes.map((v) => DESCRIPCION_VARIABLES[v].toLowerCase()).join(', ')}`,
        { faltantes },
      );
    }

    if (correos.length === 0) {
      return { encolados: 0, omitidos, primerEnvio: null, ultimoEnvio: null };
    }

    const horarios = await siguienteHorario(usuarioId, correos.length, ahora);
    await enviosRepository.crearProgramados(
      correos.map((c, i) => ({
        usuarioId,
        empresaId: c.empresa.id,
        plantillaId: plantilla.id,
        destinatario: c.empresa.correoContacto,
        asunto: c.asunto,
        cuerpo: c.cuerpo,
        fechaProgramada: horarios[i]!,
      })),
    );

    return {
      encolados: correos.length,
      omitidos,
      primerEnvio: horarios[0]!.toISOString(),
      ultimoEnvio: horarios.at(-1)!.toISOString(),
    };
  },

  async listar(usuarioId: string, filtro: Parameters<typeof enviosRepository.listar>[1]) {
    const { items, total } = await enviosRepository.listar(usuarioId, filtro);
    return { items: items.map(aEnvioPublico), total, pagina: filtro.pagina, porPagina: filtro.porPagina };
  },

  async resumen(usuarioId: string, ahora = new Date()): Promise<ResumenEnvios> {
    const usuario = await usuariosService.obtener(usuarioId);
    const r = await enviosRepository.resumen(usuarioId, ahora);
    return { ...r, limiteDiario: usuario.limiteDiario, proximoEnvio: r.proximoEnvio?.toISOString() ?? null };
  },

  async cancelar(usuarioId: string, id: string) {
    const envio = await enviosRepository.buscar(usuarioId, id);
    if (!envio) throw AppError.noEncontrado('El envío no existe');
    // updateMany con condición de estado evita cancelar uno que el worker acaba de tomar.
    const { count } = await prisma.envio.updateMany({ where: { id, estado: 'PROGRAMADO' }, data: { estado: 'CANCELADO' } });
    if (count === 0) throw AppError.conflicto('Solo se pueden cancelar envíos que aún no han salido');
    await enviosRepository.restaurarEstadoEmpresa(envio.empresaId);
  },

  async reintentar(usuarioId: string, id: string, ahora = new Date()) {
    const envio = await enviosRepository.buscar(usuarioId, id);
    if (!envio) throw AppError.noEncontrado('El envío no existe');
    if (envio.estado !== 'ERROR') throw AppError.conflicto('Solo se pueden reintentar envíos con error');
    await exigirUsuarioListo(usuarioId);

    const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: envio.empresaId } });
    if (ESTADOS_BLOQUEADOS.includes(empresa.estado)) {
      throw AppError.conflicto('La empresa está marcada como rechazado o no contactar');
    }

    const [fecha] = await siguienteHorario(usuarioId, 1, ahora);
    await prisma.$transaction([
      prisma.envio.update({
        where: { id },
        data: { estado: 'PROGRAMADO', fechaProgramada: fecha!, intentos: 0, ultimoError: null },
      }),
      prisma.empresa.update({ where: { id: envio.empresaId }, data: { estado: 'PENDIENTE' } }),
    ]);
    return aEnvioPublico((await enviosRepository.buscar(usuarioId, id))!);
  },
};
