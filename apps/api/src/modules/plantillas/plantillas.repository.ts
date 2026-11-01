import type { PlantillaDatos } from '@ep/shared';
import { prisma } from '../../lib/prisma';

// Todas las consultas filtran por usuarioId: nadie ve plantillas de otro aprendiz.
export const plantillasRepository = {
  listar: (usuarioId: string) => prisma.plantilla.findMany({ where: { usuarioId }, orderBy: { actualizadoEn: 'desc' } }),

  buscar: (usuarioId: string, id: string) => prisma.plantilla.findFirst({ where: { id, usuarioId } }),

  buscarPorNombre: (usuarioId: string, nombre: string) =>
    prisma.plantilla.findUnique({ where: { usuarioId_nombre: { usuarioId, nombre } } }),

  crear: (usuarioId: string, datos: PlantillaDatos) => prisma.plantilla.create({ data: { ...datos, usuarioId } }),

  actualizar: (id: string, datos: PlantillaDatos) => prisma.plantilla.update({ where: { id }, data: datos }),

  eliminar: (id: string) => prisma.plantilla.delete({ where: { id } }),
};
