import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PlantillaDatos } from '@ep/shared';
import { plantillasApi } from '../api/plantillas';

const CLAVE = ['plantillas'] as const;

export const usePlantillas = () => useQuery({ queryKey: CLAVE, queryFn: plantillasApi.listar });

export const usePlantilla = (id: string | undefined) =>
  useQuery({ queryKey: [...CLAVE, id], queryFn: () => plantillasApi.obtener(id!), enabled: !!id });

function useMutacionPlantillas<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: CLAVE }) });
}

export const useGuardarPlantilla = () =>
  useMutacionPlantillas(({ id, datos }: { id?: string; datos: PlantillaDatos }) =>
    id ? plantillasApi.actualizar(id, datos) : plantillasApi.crear(datos),
  );

export const useEliminarPlantilla = () => useMutacionPlantillas(plantillasApi.eliminar);
