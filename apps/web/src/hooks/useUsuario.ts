import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UsuarioPublico } from '@ep/shared';
import { usuariosApi } from '../api/usuarios';

export const CLAVE_USUARIO = ['usuario', 'yo'] as const;

export function useUsuario() {
  return useQuery({ queryKey: CLAVE_USUARIO, queryFn: usuariosApi.yo, staleTime: 60_000 });
}

/** Mutación que, al terminar, reemplaza el usuario en caché con la respuesta del API. */
export function useMutacionUsuario<V>(fn: (variables: V) => Promise<UsuarioPublico>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (usuario) => qc.setQueryData(CLAVE_USUARIO, usuario),
  });
}
