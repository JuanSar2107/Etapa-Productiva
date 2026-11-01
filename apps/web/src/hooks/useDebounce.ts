import { useEffect, useState } from 'react';

/** Devuelve `valor` solo cuando deja de cambiar durante `ms` (útil para búsquedas mientras se escribe). */
export function useDebounce<T>(valor: T, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}
