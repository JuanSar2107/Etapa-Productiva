import type {
  CambiarEstadoInput,
  OpcionesFiltro,
  PosponerSeguimientoInput,
  ResultadoCambioEstado,
  ResumenEstados,
  TablaImportacion,
  Empresa,
  EmpresaDatos,
  EmpresasPorContactar,
  ListarEmpresasQuery,
  Paginado,
  PrevisualizacionCsv,
  ResultadoImportacion,
} from '@ep/shared';
import { api } from './client';

function aParams(filtro: ListarEmpresasQuery) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filtro)) if (v !== undefined && v !== '') params.set(k, String(v));
  return params;
}

export const empresasApi = {
  listar: (filtro: ListarEmpresasQuery) => api<Paginado<Empresa>>(`/empresas?${aParams(filtro)}`),

  porContactar: (filtro: ListarEmpresasQuery) => api<EmpresasPorContactar>(`/empresas/por-contactar?${aParams(filtro)}`),

  crear: (datos: EmpresaDatos) => api<Empresa>('/empresas', { method: 'POST', body: JSON.stringify(datos) }),

  actualizar: (id: string, datos: EmpresaDatos) =>
    api<Empresa>(`/empresas/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),

  eliminar: (id: string) => api<void>(`/empresas/${id}`, { method: 'DELETE' }),

  resumenEstados: () => api<ResumenEstados>('/empresas/resumen-estados'),

  opcionesFiltro: () => api<OpcionesFiltro>('/empresas/opciones-filtro'),

  posponerSeguimiento: (datos: PosponerSeguimientoInput) =>
    api<{ pospuestas: number }>('/empresas/posponer-seguimiento', { method: 'POST', body: JSON.stringify(datos) }),

  cambiarEstado: (datos: CambiarEstadoInput) =>
    api<ResultadoCambioEstado>('/empresas/estado', { method: 'POST', body: JSON.stringify(datos) }),

  previsualizarCsv(archivo: File) {
    const form = new FormData();
    form.append('archivo', archivo);
    return api<PrevisualizacionCsv>('/empresas/importar/previsualizar', { method: 'POST', body: form });
  },

  previsualizarTabla: (tabla: TablaImportacion) =>
    api<PrevisualizacionCsv>('/empresas/importar/previsualizar-tabla', { method: 'POST', body: JSON.stringify(tabla) }),

  importar: (empresas: EmpresaDatos[]) =>
    api<ResultadoImportacion>('/empresas/importar', { method: 'POST', body: JSON.stringify({ empresas }) }),
};
