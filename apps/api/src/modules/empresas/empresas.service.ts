import type { z } from 'zod';
import {
  ESTADOS_CONTACTO,
  MAX_EMPRESAS_POR_LOTE,
  type CambiarEstadoInput,
  type EmpresasPorContactar,
  type listarEmpresasSchema,
  type PosponerSeguimientoInput,
  type Empresa,
  type EmpresaDatos,
  type OpcionesFiltro,
  type Paginado,
  type ResultadoCambioEstado,
  type ResultadoImportacion,
  type ResumenEstados,
} from '@ep/shared';
import { AppError } from '../../errors/AppError';
import { sumarDias } from '../../lib/horario';
import { usuariosService } from '../usuarios/usuarios.service';
import { empresasRepository, type EmpresaConConteo, type FiltroEmpresas } from './empresas.repository';
import { calcularProximoSeguimiento } from './seguimiento';

/**
 * El próximo seguimiento se calcula con los días que el usuario tiene configurados hoy,
 * así un cambio en la configuración aplica también a los contactos anteriores.
 */
export function aPublica(e: EmpresaConConteo, diasSeguimiento: number): Empresa {
  return {
    id: e.id,
    nombre: e.nombre,
    nit: e.nit,
    sector: e.sector,
    ciudad: e.ciudad,
    correoContacto: e.correoContacto,
    sitioWeb: e.sitioWeb,
    notas: e.notas,
    departamento: e.departamento,
    direccion: e.direccion,
    telefono: e.telefono,
    contactoNombre: e.contactoNombre,
    programaSolicitado: e.programaSolicitado,
    cupos: e.cupos,
    fechaCierre: e.fechaCierre?.toISOString().slice(0, 10) ?? null,
    fuente: e.fuente,
    estado: e.estado,
    ultimoContactoEn: e.ultimoContactoEn?.toISOString() ?? null,
    proximoSeguimientoEn: calcularProximoSeguimiento(e, diasSeguimiento)?.toISOString() ?? null,
    enviosRealizados: e._count.envios,
    creadoEn: e.creadoEn.toISOString(),
    actualizadoEn: e.actualizadoEn.toISOString(),
  };
}

const diasSeguimiento = async (usuarioId: string) => (await usuariosService.obtener(usuarioId)).diasSeguimiento;

async function obtenerPropia(usuarioId: string, id: string) {
  const empresa = await empresasRepository.buscar(usuarioId, id);
  if (!empresa) throw AppError.noEncontrado('La empresa no existe');
  return empresa;
}

async function exigirCorreoLibre(usuarioId: string, correo: string, excepto?: string) {
  const existente = await empresasRepository.buscarPorCorreo(usuarioId, correo);
  if (existente && existente.id !== excepto) {
    throw AppError.conflicto(`Ya registraste una empresa con el correo ${correo}: "${existente.nombre}"`, {
      empresaId: existente.id,
    });
  }
}

export const empresasService = {
  async listar(usuarioId: string, { seguimiento, ...query }: z.output<typeof listarEmpresasSchema>, ahora = new Date()): Promise<Paginado<Empresa>> {
    const dias = await diasSeguimiento(usuarioId);
    const filtro: FiltroEmpresas = {
      ...query,
      ...(seguimiento === 'pendiente' && { seguimientoPendiente: { diasSeguimiento: dias, ahora } }),
    };
    const { items, total } = await empresasRepository.listar(usuarioId, filtro);
    return { items: items.map((e) => aPublica(e, dias)), total, pagina: filtro.pagina, porPagina: filtro.porPagina };
  },

  /**
   * Para «Escribir a todas las que coinciden»: solo las que nunca se han contactado. Las demás
   * (ya enviadas, en cola, rechazadas, no contactar) se saltan para no escribirles de nuevo.
   */
  async porContactar(
    usuarioId: string,
    { seguimiento: _seguimiento, pagina: _pagina, porPagina: _porPagina, ...filtro }: z.output<typeof listarEmpresasSchema>,
  ): Promise<EmpresasPorContactar> {
    const dias = await diasSeguimiento(usuarioId);
    const r = await empresasRepository.porContactar(usuarioId, filtro, MAX_EMPRESAS_POR_LOTE);
    return { items: r.items.map((e) => aPublica(e, dias)), totalFiltro: r.totalFiltro, totalPorContactar: r.totalPorContactar };
  },

  async posponerSeguimiento(usuarioId: string, { empresaIds, dias }: PosponerSeguimientoInput, ahora = new Date()) {
    const pospuestas = await empresasRepository.posponerSeguimiento(usuarioId, [...new Set(empresaIds)], sumarDias(ahora, dias));
    if (pospuestas === 0) throw AppError.noEncontrado('Ninguna de las empresas está esperando respuesta');
    return { pospuestas };
  },

  async obtener(usuarioId: string, id: string) {
    return aPublica(await obtenerPropia(usuarioId, id), await diasSeguimiento(usuarioId));
  },

  async resumenEstados(usuarioId: string, ahora = new Date()): Promise<ResumenEstados> {
    const [conteo, seguimientoPendiente] = await Promise.all([
      empresasRepository.contarPorEstado(usuarioId),
      diasSeguimiento(usuarioId).then((dias) => empresasRepository.contarSeguimientoPendiente(usuarioId, dias, ahora)),
    ]);
    const porEstado = Object.fromEntries(ESTADOS_CONTACTO.map((e) => [e, conteo.get(e) ?? 0])) as Record<
      (typeof ESTADOS_CONTACTO)[number],
      number
    >;
    return { ...porEstado, total: [...conteo.values()].reduce((a, b) => a + b, 0), seguimientoPendiente };
  },

  opcionesFiltro: (usuarioId: string): Promise<OpcionesFiltro> => empresasRepository.opcionesFiltro(usuarioId),

  async crear(usuarioId: string, datos: EmpresaDatos) {
    await exigirCorreoLibre(usuarioId, datos.correoContacto);
    return aPublica(await empresasRepository.crear(usuarioId, datos), await diasSeguimiento(usuarioId));
  },

  async actualizar(usuarioId: string, id: string, datos: EmpresaDatos) {
    await obtenerPropia(usuarioId, id);
    await exigirCorreoLibre(usuarioId, datos.correoContacto, id);
    return aPublica(await empresasRepository.actualizar(id, datos), await diasSeguimiento(usuarioId));
  },

  async cambiarEstado(usuarioId: string, { empresaIds, estado }: CambiarEstadoInput): Promise<ResultadoCambioEstado> {
    const resultado = await empresasRepository.cambiarEstado(usuarioId, [...new Set(empresaIds)], estado);
    if (resultado.actualizadas === 0) throw AppError.noEncontrado('No se encontraron las empresas');
    return resultado;
  },

  async eliminar(usuarioId: string, id: string) {
    await obtenerPropia(usuarioId, id);
    await empresasRepository.eliminar(id);
  },

  async importar(usuarioId: string, empresas: EmpresaDatos[]): Promise<ResultadoImportacion> {
    // Quitamos repetidos dentro del mismo lote; los que ya existen en la base los omite createMany.
    const unicas = [...new Map(empresas.map((e) => [e.correoContacto, e])).values()];
    const creadas = await empresasRepository.crearVarias(usuarioId, unicas, 'CSV');
    return { creadas, omitidas: empresas.length - creadas };
  },
};
