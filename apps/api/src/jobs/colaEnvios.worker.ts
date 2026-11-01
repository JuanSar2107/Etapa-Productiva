import { env } from '../config/env';
import { clasificarErrorGmail } from '../errors/gmailErrors';
import { almacenamiento } from '../lib/almacenamiento';
import { obtenerEnviador, type EnviarCorreoGmail } from '../lib/gmail';
import { siguienteDiaHabil, sumarDias } from '../lib/horario';
import { construirMime } from '../lib/mime';
import { prisma } from '../lib/prisma';
import { enviosRepository, ESTADOS_BLOQUEADOS } from '../modules/envios/envios.repository';
import { enviosService } from '../modules/envios/envios.service';

const INTERVALO_MS = 60 * 1000;
const MAX_INTENTOS = 5;
const MINUTO = 60 * 1000;
/** Un envío que lleva más de esto en ENVIANDO se considera interrumpido (por ejemplo, se reinició el servidor). */
const ATASCADO_MS = 10 * MINUTO;

async function marcarError(envioId: string, empresaId: string, mensaje: string) {
  await prisma.envio.update({ where: { id: envioId }, data: { estado: 'ERROR', ultimoError: mensaje } });
  await enviosRepository.restaurarEstadoEmpresa(empresaId);
}

async function reprogramar(envioId: string, fecha: Date, mensaje: string | null) {
  await prisma.envio.update({ where: { id: envioId }, data: { estado: 'PROGRAMADO', fechaProgramada: fecha, ultimoError: mensaje } });
}

/** Envía un correo programado. Devuelve sin hacer nada si otro proceso ya lo tomó. */
export async function procesarEnvio(id: string, enviar: EnviarCorreoGmail, ahora = new Date()) {
  // Tomamos el envío de forma atómica: solo un proceso puede pasarlo de PROGRAMADO a ENVIANDO.
  const { count } = await prisma.envio.updateMany({
    where: { id, estado: 'PROGRAMADO' },
    data: { estado: 'ENVIANDO', intentos: { increment: 1 } },
  });
  if (count === 0) return;

  const envio = await prisma.envio.findUniqueOrThrow({ where: { id }, include: { usuario: true, empresa: true } });
  const { usuario, empresa } = envio;

  // Revisamos justo antes de enviar: la empresa pudo pedir no ser contactada mientras esperaba.
  if (ESTADOS_BLOQUEADOS.includes(empresa.estado)) {
    await prisma.envio.update({
      where: { id },
      data: { estado: 'CANCELADO', ultimoError: 'La empresa está marcada como rechazado o no contactar' },
    });
    return;
  }

  if ((await enviosRepository.enviadosHoy(usuario.id, ahora)) >= usuario.limiteDiario) {
    const [fecha] = await enviosService.siguienteHorario(usuario.id, 1, siguienteDiaHabil(ahora, Math.random));
    await reprogramar(id, fecha!, null);
    return;
  }

  if (!usuario.hojaVidaRuta || !usuario.hojaVidaNombre) {
    await marcarError(id, empresa.id, 'No tienes hoja de vida subida. Súbela en tu perfil y reintenta.');
    return;
  }

  try {
    const mime = construirMime({
      de: { nombre: usuario.nombre, correo: usuario.correo },
      para: envio.destinatario,
      asunto: envio.asunto,
      cuerpo: envio.cuerpo,
      adjunto: {
        nombre: usuario.hojaVidaNombre,
        tipo: 'application/pdf',
        contenido: await almacenamiento.leer(usuario.hojaVidaRuta),
      },
    });
    const resultado = await enviar(usuario, mime);

    await prisma.$transaction([
      prisma.envio.update({
        where: { id },
        data: {
          estado: 'ENVIADO',
          fechaEnvio: ahora,
          gmailMessageId: resultado.id,
          gmailThreadId: resultado.threadId,
          fechaProximoSeguimiento: sumarDias(ahora, usuario.diasSeguimiento),
          ultimoError: null,
        },
      }),
      // Un correo nuevo reinicia el ciclo de seguimiento (y anula cualquier aplazamiento).
      prisma.empresa.update({ where: { id: empresa.id }, data: { ultimoContactoEn: ahora, recordatorioHasta: null } }),
      // Solo pasa a ENVIADO si seguía "en cola"; si el aprendiz cambió el estado a mano, se respeta.
      prisma.empresa.updateMany({ where: { id: empresa.id, estado: 'PENDIENTE' }, data: { estado: 'ENVIADO' } }),
    ]);
  } catch (err) {
    const { tipo, mensaje } = clasificarErrorGmail(err);
    console.warn(`[cola] envío ${id} falló (${tipo}): ${mensaje}`);

    switch (tipo) {
      case 'reconectar':
        // Se queda en cola; el worker ignora a este usuario hasta que vuelva a iniciar sesión.
        await prisma.usuario.update({ where: { id: usuario.id }, data: { requiereReconexion: true } });
        await reprogramar(id, envio.fechaProgramada, mensaje);
        break;
      case 'cuotaDiaria':
        await reprogramar(id, siguienteDiaHabil(ahora, Math.random), mensaje);
        break;
      case 'temporal':
        if (envio.intentos + 1 >= MAX_INTENTOS) {
          await marcarError(id, empresa.id, `${mensaje} Se agotaron los reintentos.`);
        } else {
          // Espera creciente: 5, 10, 20, 40 minutos.
          await reprogramar(id, new Date(ahora.getTime() + 5 * MINUTO * 2 ** envio.intentos), mensaje);
        }
        break;
      case 'permanente':
        await marcarError(id, empresa.id, mensaje);
        break;
    }
  }
}

/** Marca como error los envíos que quedaron a medias; no se reintentan solos porque pudieron haber salido. */
async function recuperarAtascados(ahora: Date) {
  const atascados = await prisma.envio.findMany({
    where: { estado: 'ENVIANDO', actualizadoEn: { lt: new Date(ahora.getTime() - ATASCADO_MS) } },
    select: { id: true, empresaId: true },
  });
  for (const e of atascados) {
    await marcarError(
      e.id,
      e.empresaId,
      'El envío se interrumpió. Revisa en Gmail (carpeta Enviados) si salió antes de reintentarlo.',
    );
  }
}

/**
 * ¿Ya pasó la espera mínima desde el último correo del usuario? Si la cola se atrasó
 * (servidor apagado, fin de semana), evita que los correos pendientes salgan uno por minuto.
 */
async function respetaEspaciado(usuarioId: string, espaciadoMinSeg: number, ahora: Date) {
  const ultimo = await prisma.envio.findFirst({
    where: { usuarioId, estado: 'ENVIADO' },
    orderBy: { fechaEnvio: 'desc' },
    select: { fechaEnvio: true },
  });
  return !ultimo?.fechaEnvio || ahora.getTime() - ultimo.fechaEnvio.getTime() >= espaciadoMinSeg * 1000;
}

/** Una pasada de la cola: como máximo un correo por usuario, para respetar el espaciado. */
export async function procesarCola(enviar: EnviarCorreoGmail, ahora = new Date()) {
  await recuperarAtascados(ahora);

  const pendientes = await prisma.envio.findMany({
    where: { estado: 'PROGRAMADO', fechaProgramada: { lte: ahora }, usuario: { requiereReconexion: false } },
    orderBy: { fechaProgramada: 'asc' },
    select: { id: true, usuarioId: true, usuario: { select: { espaciadoMinSeg: true } } },
    take: 100,
  });

  // El primero de cada usuario es el más antiguo (la lista viene ordenada por fecha).
  const unoPorUsuario = new Map<string, (typeof pendientes)[number]>();
  for (const p of pendientes) if (!unoPorUsuario.has(p.usuarioId)) unoPorUsuario.set(p.usuarioId, p);

  for (const { id, usuarioId, usuario } of unoPorUsuario.values()) {
    if (!(await respetaEspaciado(usuarioId, usuario.espaciadoMinSeg, ahora))) continue;
    try {
      await procesarEnvio(id, enviar, ahora);
    } catch (err) {
      console.error(`[cola] error inesperado procesando ${id}:`, err);
    }
  }
}

export function iniciarColaEnvios() {
  const enviar = obtenerEnviador();
  console.log(`Cola de envíos activa (Gmail ${env.GMAIL_MODO}), revisa cada ${INTERVALO_MS / 1000} s`);

  let ocupado = false;
  const tick = async () => {
    if (ocupado) return; // evita pasadas superpuestas si una tarda más de un minuto
    ocupado = true;
    try {
      await procesarCola(enviar);
    } catch (err) {
      console.error('[cola] error en la pasada:', err);
    } finally {
      ocupado = false;
    }
  };

  const temporizador = setInterval(tick, INTERVALO_MS);
  setTimeout(tick, 5000);
  return () => clearInterval(temporizador);
}
