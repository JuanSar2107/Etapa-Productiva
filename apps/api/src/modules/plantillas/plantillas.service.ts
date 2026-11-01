import type { Plantilla as PlantillaDb } from '@prisma/client';
import type { Plantilla, PlantillaDatos } from '@ep/shared';
import { AppError } from '../../errors/AppError';
import { plantillasRepository } from './plantillas.repository';

export function aPublica(p: PlantillaDb): Plantilla {
  return {
    id: p.id,
    nombre: p.nombre,
    asunto: p.asunto,
    cuerpo: p.cuerpo,
    incluirLineaExclusion: p.incluirLineaExclusion,
    creadoEn: p.creadoEn.toISOString(),
    actualizadoEn: p.actualizadoEn.toISOString(),
  };
}

async function obtenerPropia(usuarioId: string, id: string) {
  const plantilla = await plantillasRepository.buscar(usuarioId, id);
  if (!plantilla) throw AppError.noEncontrado('La plantilla no existe');
  return plantilla;
}

async function exigirNombreLibre(usuarioId: string, nombre: string, excepto?: string) {
  const existente = await plantillasRepository.buscarPorNombre(usuarioId, nombre);
  if (existente && existente.id !== excepto) {
    throw AppError.conflicto(`Ya tienes una plantilla llamada "${nombre}"`);
  }
}

export const plantillasService = {
  async listar(usuarioId: string) {
    return (await plantillasRepository.listar(usuarioId)).map(aPublica);
  },

  async obtener(usuarioId: string, id: string) {
    return aPublica(await obtenerPropia(usuarioId, id));
  },

  async crear(usuarioId: string, datos: PlantillaDatos) {
    await exigirNombreLibre(usuarioId, datos.nombre);
    return aPublica(await plantillasRepository.crear(usuarioId, datos));
  },

  async actualizar(usuarioId: string, id: string, datos: PlantillaDatos) {
    await obtenerPropia(usuarioId, id);
    await exigirNombreLibre(usuarioId, datos.nombre, id);
    return aPublica(await plantillasRepository.actualizar(id, datos));
  },

  /** Los envíos ya hechos conservan su copia del correo; solo pierden la referencia a la plantilla. */
  async eliminar(usuarioId: string, id: string) {
    await obtenerPropia(usuarioId, id);
    await plantillasRepository.eliminar(id);
  },
};
