import type { Plantilla, PlantillaDatos } from '@ep/shared';
import { api } from './client';

export const plantillasApi = {
  listar: () => api<Plantilla[]>('/plantillas'),

  obtener: (id: string) => api<Plantilla>(`/plantillas/${id}`),

  crear: (datos: PlantillaDatos) => api<Plantilla>('/plantillas', { method: 'POST', body: JSON.stringify(datos) }),

  actualizar: (id: string, datos: PlantillaDatos) =>
    api<Plantilla>(`/plantillas/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),

  eliminar: (id: string) => api<void>(`/plantillas/${id}`, { method: 'DELETE' }),
};
