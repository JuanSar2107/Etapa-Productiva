import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EmpresaDatos, ListarEmpresasQuery } from '@ep/shared';
import { empresasApi } from '../api/empresas';

const CLAVE = ['empresas'] as const;

export function useEmpresas(filtro: ListarEmpresasQuery) {
  return useQuery({
    queryKey: [...CLAVE, filtro],
    queryFn: () => empresasApi.listar(filtro),
    placeholderData: keepPreviousData, // evita parpadeos al cambiar de página o filtro
  });
}

/** Se refresca cada 5 minutos para que la insignia de seguimientos pendientes esté al día. */
export const useResumenEstados = () =>
  useQuery({ queryKey: [...CLAVE, 'resumen'], queryFn: empresasApi.resumenEstados, refetchInterval: 5 * 60_000 });

export const useOpcionesFiltro = () =>
  useQuery({ queryKey: [...CLAVE, 'opciones'], queryFn: empresasApi.opcionesFiltro, staleTime: 5 * 60_000 });

function useMutacionEmpresas<V, R>(fn: (v: V) => Promise<R>, tambienEnvios = false) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLAVE });
      if (tambienEnvios) qc.invalidateQueries({ queryKey: ['envios'] });
    },
  });
}

export const useGuardarEmpresa = () =>
  useMutacionEmpresas(({ id, datos }: { id?: string; datos: EmpresaDatos }) =>
    id ? empresasApi.actualizar(id, datos) : empresasApi.crear(datos),
  );

export const useEliminarEmpresa = () => useMutacionEmpresas(empresasApi.eliminar, true);

export const useImportarEmpresas = () => useMutacionEmpresas(empresasApi.importar);

export const usePosponerSeguimiento = () => useMutacionEmpresas(empresasApi.posponerSeguimiento);

/** Cambiar el estado puede cancelar correos en cola, así que también refresca los envíos. */
export const useCambiarEstado = () => useMutacionEmpresas(empresasApi.cambiarEstado, true);
