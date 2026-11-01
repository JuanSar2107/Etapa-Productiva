/**
 * Clasifica los errores de Google para decidir qué hacer con un envío:
 * - reconectar: el usuario debe volver a iniciar sesión (token revocado o sin permiso).
 * - cuotaDiaria: Gmail no deja enviar más hoy → se pasa al siguiente día.
 * - temporal: límite por minuto, error 5xx o de red → se reintenta con espera creciente.
 * - permanente: el correo no se puede enviar (destinatario inválido, mensaje rechazado).
 */
export type TipoErrorGmail = 'reconectar' | 'cuotaDiaria' | 'temporal' | 'permanente';

export interface ErrorGmailClasificado {
  tipo: TipoErrorGmail;
  mensaje: string;
}

export class ErrorGmail extends Error {
  constructor(
    public readonly status: number,
    public readonly razones: string[],
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorGmail';
  }
}

export function clasificarErrorGmail(err: unknown): ErrorGmailClasificado {
  // Error al refrescar el token (google-auth-library / gaxios)
  const datosAuth = (err as { response?: { data?: { error?: string } } })?.response?.data;
  if (datosAuth?.error === 'invalid_grant' || (err as Error)?.message?.includes('invalid_grant')) {
    return { tipo: 'reconectar', mensaje: 'Google revocó el acceso a tu Gmail. Vuelve a iniciar sesión.' };
  }

  if (err instanceof ErrorGmail) {
    const r = err.razones;
    if (err.status === 401) {
      return { tipo: 'reconectar', mensaje: 'La sesión de Gmail expiró. Vuelve a iniciar sesión.' };
    }
    if (err.status === 403 && r.some((x) => x === 'insufficientPermissions' || x === 'forbidden')) {
      return { tipo: 'reconectar', mensaje: 'Falta el permiso para enviar correos desde Gmail. Vuelve a iniciar sesión.' };
    }
    if (r.includes('dailyLimitExceeded') || /daily.*limit/i.test(err.message)) {
      return { tipo: 'cuotaDiaria', mensaje: 'Gmail alcanzó el límite diario de envíos de tu cuenta. Se reintentará mañana.' };
    }
    if (err.status === 429 || r.some((x) => x === 'rateLimitExceeded' || x === 'userRateLimitExceeded')) {
      return { tipo: 'temporal', mensaje: 'Gmail pidió esperar un momento (límite de velocidad). Se reintentará.' };
    }
    if (err.status >= 500) {
      return { tipo: 'temporal', mensaje: `Gmail no respondió correctamente (${err.status}). Se reintentará.` };
    }
    return { tipo: 'permanente', mensaje: `Gmail rechazó el correo: ${err.message}` };
  }

  // Errores de red (sin respuesta del servidor)
  return { tipo: 'temporal', mensaje: `No se pudo conectar con Gmail: ${(err as Error)?.message ?? 'error desconocido'}` };
}
