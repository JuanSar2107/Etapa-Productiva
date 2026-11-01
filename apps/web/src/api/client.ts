import type { ErrorApi } from '@ep/shared';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensaje: string,
    public readonly detalles?: unknown,
  ) {
    super(mensaje);
  }
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const esFormData = opciones.body instanceof FormData;
  const res = await fetch(`/api${ruta}`, {
    credentials: 'include',
    ...opciones,
    headers: {
      ...(opciones.body && !esFormData ? { 'Content-Type': 'application/json' } : {}),
      ...opciones.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const cuerpo: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (cuerpo as ErrorApi | null)?.error;
    throw new ApiError(res.status, error?.codigo ?? 'ERROR', error?.mensaje ?? 'No se pudo conectar con el servidor', error?.detalles);
  }
  return cuerpo as T;
}

/** Convierte los detalles de un error de validación del API en { campo: mensaje }. */
export function erroresDeCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !Array.isArray(error.detalles)) return {};
  return Object.fromEntries(
    (error.detalles as { campo: string; mensaje: string }[]).map((d) => [d.campo, d.mensaje]),
  );
}
