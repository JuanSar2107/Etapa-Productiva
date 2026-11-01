import type {
  EncolarEnviosInput,
  Envio,
  ListarEnviosQuery,
  Paginado,
  PlantillaDatos,
  ResultadoEncolar,
  ResumenEnvios,
} from '@ep/shared';
import { api } from './client';

export const enviosApi = {
  encolar: (datos: EncolarEnviosInput) => api<ResultadoEncolar>('/envios', { method: 'POST', body: JSON.stringify(datos) }),

  listar(filtro: ListarEnviosQuery) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filtro)) if (v !== undefined && v !== '') params.set(k, String(v));
    return api<Paginado<Envio>>(`/envios?${params}`);
  },

  resumen: () => api<ResumenEnvios>('/envios/resumen'),

  enviarPrueba: (plantilla: Pick<PlantillaDatos, 'asunto' | 'cuerpo' | 'incluirLineaExclusion'>) =>
    api<{ enviadoA: string; simulado: boolean }>('/envios/prueba', { method: 'POST', body: JSON.stringify(plantilla) }),

  cancelar: (id: string) => api<void>(`/envios/${id}/cancelar`, { method: 'POST' }),

  reintentar: (id: string) => api<Envio>(`/envios/${id}/reintentar`, { method: 'POST' }),
};
