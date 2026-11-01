import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListarEnviosQuery } from '@ep/shared';
import { enviosApi } from '../api/envios';

const CLAVE = ['envios'] as const;
/** La cola avanza sola en el servidor: refrescamos cada 30 s mientras la página esté abierta. */
const REFRESCO_MS = 30_000;

export const useEnvios = (filtro: ListarEnviosQuery) =>
  useQuery({
    queryKey: [...CLAVE, 'lista', filtro],
    queryFn: () => enviosApi.listar(filtro),
    placeholderData: keepPreviousData,
    refetchInterval: REFRESCO_MS,
  });

export const useResumenEnvios = () =>
  useQuery({ queryKey: [...CLAVE, 'resumen'], queryFn: enviosApi.resumen, refetchInterval: REFRESCO_MS });

/** Encolar, cancelar o reintentar cambian también el estado de las empresas. */
function useMutacionEnvios<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE });
      qc.invalidateQueries({ queryKey: ['empresas'] });
    },
  });
}

export const useEncolarEnvios = () => useMutacionEnvios(enviosApi.encolar);
export const useCancelarEnvio = () => useMutacionEnvios(enviosApi.cancelar);
export const useReintentarEnvio = () => useMutacionEnvios(enviosApi.reintentar);
