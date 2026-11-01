import type { EstadoContacto, EstadoEnvio, Prisma } from '@prisma/client';
import { claveDia, inicioDia } from '../../lib/horario';
import { prisma } from '../../lib/prisma';

export const ESTADOS_BLOQUEADOS: EstadoContacto[] = ['RECHAZADO', 'NO_CONTACTAR'];

const incluirResumen = {
  empresa: { select: { id: true, nombre: true, correoContacto: true } },
  plantilla: { select: { nombre: true } },
} satisfies Prisma.EnvioInclude;

export type EnvioConRelaciones = Prisma.EnvioGetPayload<{ include: typeof incluirResumen }>;

export const enviosRepository = {
  /**
   * Correos enviados hoy y programados a futuro, agrupados por día, y la fecha del último
   * envío (hecho o programado). Es lo que necesita el planificador para respetar el límite.
   */
  async ocupacion(usuarioId: string, ahora: Date) {
    const envios = await prisma.envio.findMany({
      where: {
        usuarioId,
        OR: [{ estado: { in: ['PROGRAMADO', 'ENVIANDO'] } }, { estado: 'ENVIADO', fechaEnvio: { gte: inicioDia(ahora) } }],
      },
      select: { estado: true, fechaProgramada: true, fechaEnvio: true },
    });
    const ocupacion = new Map<string, number>();
    let ultimo: Date | null = null;
    for (const e of envios) {
      const fecha = e.estado === 'ENVIADO' && e.fechaEnvio ? e.fechaEnvio : e.fechaProgramada;
      ocupacion.set(claveDia(fecha), (ocupacion.get(claveDia(fecha)) ?? 0) + 1);
      if (!ultimo || fecha > ultimo) ultimo = fecha;
    }
    return { ocupacion, ultimo };
  },

  /** Crea los envíos programados y marca las empresas como "en cola" en una sola transacción. */
  crearProgramados(filas: Prisma.EnvioCreateManyInput[]) {
    return prisma.$transaction([
      prisma.envio.createMany({ data: filas }),
      prisma.empresa.updateMany({ where: { id: { in: filas.map((f) => f.empresaId) } }, data: { estado: 'PENDIENTE' } }),
    ]);
  },

  async listar(usuarioId: string, filtro: { estado?: EstadoEnvio; empresaId?: string; pagina: number; porPagina: number }) {
    const where: Prisma.EnvioWhereInput = {
      usuarioId,
      ...(filtro.estado && { estado: filtro.estado }),
      ...(filtro.empresaId && { empresaId: filtro.empresaId }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.envio.findMany({
        where,
        include: incluirResumen,
        orderBy: { fechaProgramada: 'desc' },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      prisma.envio.count({ where }),
    ]);
    return { items, total };
  },

  buscar: (usuarioId: string, id: string) => prisma.envio.findFirst({ where: { id, usuarioId }, include: incluirResumen }),

  async resumen(usuarioId: string, ahora: Date) {
    const [enviadosHoy, programados, conError, proximo] = await prisma.$transaction([
      prisma.envio.count({ where: { usuarioId, estado: 'ENVIADO', fechaEnvio: { gte: inicioDia(ahora) } } }),
      prisma.envio.count({ where: { usuarioId, estado: { in: ['PROGRAMADO', 'ENVIANDO'] } } }),
      prisma.envio.count({ where: { usuarioId, estado: 'ERROR' } }),
      prisma.envio.findFirst({ where: { usuarioId, estado: 'PROGRAMADO' }, orderBy: { fechaProgramada: 'asc' } }),
    ]);
    return { enviadosHoy, programados, conError, proximoEnvio: proximo?.fechaProgramada ?? null };
  },

  enviadosHoy: (usuarioId: string, ahora: Date) =>
    prisma.envio.count({ where: { usuarioId, estado: 'ENVIADO', fechaEnvio: { gte: inicioDia(ahora) } } }),

  /**
   * Estado que debe tener la empresa cuando un envío se cancela o falla:
   * sigue "en cola" si tiene otro programado, "enviado" si alguna vez se le escribió, o "sin contactar".
   */
  async restaurarEstadoEmpresa(empresaId: string) {
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { estado: true } });
    // Si el aprendiz ya la marcó como respondió/rechazado/no contactar, no se toca.
    if (!empresa || empresa.estado !== 'PENDIENTE') return;

    const [programados, enviados] = await prisma.$transaction([
      prisma.envio.count({ where: { empresaId, estado: { in: ['PROGRAMADO', 'ENVIANDO'] } } }),
      prisma.envio.count({ where: { empresaId, estado: 'ENVIADO' } }),
    ]);
    const estado: EstadoContacto = programados > 0 ? 'PENDIENTE' : enviados > 0 ? 'ENVIADO' : 'SIN_CONTACTAR';
    await prisma.empresa.update({ where: { id: empresaId }, data: { estado } });
  },
};
