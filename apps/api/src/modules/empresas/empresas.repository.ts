import type { EmpresaDatos, EstadoContacto, OrdenEmpresas } from '@ep/shared';
import type { FuenteEmpresa, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { filtroSeguimientoPendiente } from './seguimiento';

export interface FiltroEmpresas {
  q?: string;
  estado?: EstadoContacto;
  ciudad?: string;
  sector?: string;
  orden: OrdenEmpresas;
  /** Si se pasa, solo empresas a las que ya toca hacer seguimiento. */
  seguimientoPendiente?: { diasSeguimiento: number; ahora: Date };
  pagina: number;
  porPagina: number;
}

function filtroWhere(
  usuarioId: string,
  { q, estado, ciudad, sector, seguimientoPendiente }: Omit<FiltroEmpresas, 'orden' | 'pagina' | 'porPagina'>,
): Prisma.EmpresaWhereInput {
  const contiene = (campo: 'nombre' | 'correoContacto' | 'ciudad' | 'sector' | 'nit') => ({
    [campo]: { contains: q, mode: 'insensitive' as const },
  });
  // Se combinan con AND porque la búsqueda y el seguimiento usan cada uno su propio OR.
  return {
    usuarioId,
    AND: [
      ...(estado ? [{ estado }] : []),
      ...(ciudad ? [{ ciudad: { equals: ciudad, mode: 'insensitive' as const } }] : []),
      ...(sector ? [{ sector: { equals: sector, mode: 'insensitive' as const } }] : []),
      ...(q ? [{ OR: [contiene('nombre'), contiene('correoContacto'), contiene('ciudad'), contiene('sector'), contiene('nit')] }] : []),
      ...(seguimientoPendiente
        ? [filtroSeguimientoPendiente(seguimientoPendiente.diasSeguimiento, seguimientoPendiente.ahora)]
        : []),
    ],
  };
}

const ORDEN: Record<OrdenEmpresas, Prisma.EmpresaOrderByWithRelationInput[]> = {
  recientes: [{ creadoEn: 'desc' }],
  nombre: [{ nombre: 'asc' }],
  ultimoContacto: [{ ultimoContactoEn: { sort: 'desc', nulls: 'last' } }, { nombre: 'asc' }],
  // El contacto más antiguo es el que más urge revisar.
  seguimiento: [{ ultimoContactoEn: { sort: 'asc', nulls: 'last' } }, { nombre: 'asc' }],
};

/** Incluye cuántos correos se le han enviado de verdad a cada empresa. */
const conConteo = { _count: { select: { envios: { where: { estado: 'ENVIADO' } } } } } satisfies Prisma.EmpresaInclude;
export type EmpresaConConteo = Prisma.EmpresaGetPayload<{ include: typeof conConteo }>;

/** La fecha de cierre viaja como "2026-12-07"; en la base es una columna DATE. */
const aDb = (d: EmpresaDatos) => ({
  ...d,
  fechaCierre: d.fechaCierre ? new Date(`${d.fechaCierre}T00:00:00Z`) : d.fechaCierre,
});

// Todas las consultas filtran por usuarioId: un aprendiz nunca ve ni modifica empresas de otro.
export const empresasRepository = {
  async listar(usuarioId: string, filtro: FiltroEmpresas) {
    const where = filtroWhere(usuarioId, filtro);
    const [items, total] = await prisma.$transaction([
      prisma.empresa.findMany({
        where,
        include: conConteo,
        orderBy: ORDEN[filtro.orden],
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      prisma.empresa.count({ where }),
    ]);
    return { items, total };
  },

  buscar: (usuarioId: string, id: string) => prisma.empresa.findFirst({ where: { id, usuarioId }, include: conConteo }),

  buscarPorCorreo: (usuarioId: string, correoContacto: string) =>
    prisma.empresa.findUnique({ where: { usuarioId_correoContacto: { usuarioId, correoContacto } } }),

  /** Correos y NIT ya registrados, para detectar duplicados al importar. */
  async identificadores(usuarioId: string) {
    const filas = await prisma.empresa.findMany({ where: { usuarioId }, select: { correoContacto: true, nit: true } });
    return {
      correos: new Set(filas.map((f) => f.correoContacto)),
      nits: new Set(filas.flatMap((f) => (f.nit ? [f.nit] : []))),
    };
  },

  async contarPorEstado(usuarioId: string) {
    const grupos = await prisma.empresa.groupBy({ by: ['estado'], where: { usuarioId }, _count: { _all: true } });
    return new Map(grupos.map((g) => [g.estado, g._count._all]));
  },

  contarSeguimientoPendiente: (usuarioId: string, diasSeguimiento: number, ahora: Date) =>
    prisma.empresa.count({ where: { usuarioId, ...filtroSeguimientoPendiente(diasSeguimiento, ahora) } }),

  /** Pospone el recordatorio; solo aplica a empresas en estado ENVIADO, que son las que lo tienen. */
  async posponerSeguimiento(usuarioId: string, empresaIds: string[], hasta: Date) {
    const { count } = await prisma.empresa.updateMany({
      where: { usuarioId, id: { in: empresaIds }, estado: 'ENVIADO' },
      data: { recordatorioHasta: hasta },
    });
    return count;
  },

  /** Ciudades y sectores que el usuario ya usó, para los filtros del panel. */
  async opcionesFiltro(usuarioId: string) {
    const [ciudades, sectores] = await prisma.$transaction([
      prisma.empresa.findMany({ where: { usuarioId, ciudad: { not: null } }, distinct: ['ciudad'], select: { ciudad: true }, orderBy: { ciudad: 'asc' } }),
      prisma.empresa.findMany({ where: { usuarioId, sector: { not: null } }, distinct: ['sector'], select: { sector: true }, orderBy: { sector: 'asc' } }),
    ]);
    return {
      ciudades: ciudades.flatMap((c) => (c.ciudad ? [c.ciudad] : [])),
      sectores: sectores.flatMap((s) => (s.sector ? [s.sector] : [])),
    };
  },

  crear: (usuarioId: string, datos: EmpresaDatos, fuente: FuenteEmpresa = 'MANUAL') =>
    prisma.empresa.create({ data: { ...aDb(datos), usuarioId, fuente }, include: conConteo }),

  async crearVarias(usuarioId: string, empresas: EmpresaDatos[], fuente: FuenteEmpresa) {
    const { count } = await prisma.empresa.createMany({
      data: empresas.map((e) => ({ ...aDb(e), usuarioId, fuente })),
      skipDuplicates: true, // respeta @@unique([usuarioId, correoContacto])
    });
    return count;
  },

  actualizar: (id: string, datos: EmpresaDatos) => prisma.empresa.update({ where: { id }, data: aDb(datos), include: conConteo }),

  /**
   * Cambia el estado a mano. Los correos que seguían en cola se cancelan: si la empresa
   * respondió, rechazó o pidió no ser contactada, no debe recibir otro correo.
   */
  async cambiarEstado(usuarioId: string, empresaIds: string[], estado: EstadoContacto) {
    const propias = await prisma.empresa.findMany({ where: { usuarioId, id: { in: empresaIds } }, select: { id: true } });
    const ids = propias.map((e) => e.id);
    const [cancelados, actualizadas] = await prisma.$transaction([
      prisma.envio.updateMany({
        where: { empresaId: { in: ids }, estado: 'PROGRAMADO' },
        data: { estado: 'CANCELADO', ultimoError: 'Cancelado porque cambiaste el estado de la empresa' },
      }),
      prisma.empresa.updateMany({ where: { id: { in: ids } }, data: { estado } }),
    ]);
    return { actualizadas: actualizadas.count, enviosCancelados: cancelados.count };
  },

  eliminar: (id: string) => prisma.empresa.delete({ where: { id } }),
};
