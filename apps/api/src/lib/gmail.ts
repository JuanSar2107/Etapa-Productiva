import type { Usuario } from '@prisma/client';
import { env } from '../config/env';
import { ErrorGmail } from '../errors/gmailErrors';
import { prisma } from './prisma';
import { crearClienteOAuth } from './googleOAuth';
import { cifrarToken, descifrarToken } from './tokens';

/**
 * Endpoint de subida: acepta el correo completo (RFC 822) de hasta 35 MB,
 * así un PDF de 5 MB cabe sin problema.
 */
const URL_ENVIO = 'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=media';

/** Devuelve un access token válido, refrescándolo con el refresh token si expiró. */
async function obtenerAccessToken(usuario: Usuario): Promise<string> {
  if (!usuario.refreshTokenCifrado) throw new ErrorGmail(401, [], 'No hay refresh token guardado');

  const cliente = crearClienteOAuth();
  cliente.setCredentials({
    refresh_token: descifrarToken(usuario.refreshTokenCifrado),
    access_token: usuario.accessTokenCifrado ? descifrarToken(usuario.accessTokenCifrado) : undefined,
    expiry_date: usuario.tokenExpiraEn?.getTime(),
  });

  const { token } = await cliente.getAccessToken();
  if (!token) throw new ErrorGmail(401, [], 'Google no entregó un access token');

  // Si Google entregó un token nuevo, lo guardamos cifrado para no refrescar en cada envío.
  const nuevas = cliente.credentials;
  if (nuevas.access_token && nuevas.expiry_date && nuevas.expiry_date !== usuario.tokenExpiraEn?.getTime()) {
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { accessTokenCifrado: cifrarToken(nuevas.access_token), tokenExpiraEn: new Date(nuevas.expiry_date) },
    });
  }
  return token;
}

export interface ResultadoGmail {
  id: string;
  threadId: string;
}

export type EnviarCorreoGmail = (usuario: Usuario, mime: string) => Promise<ResultadoGmail>;

/** En modo simulado no se llama a Gmail: sirve para probar la app sin enviar correos reales. */
const enviarSimulado: EnviarCorreoGmail = async (usuario, mime) => {
  const asunto = /^Subject: (.*)$/m.exec(mime)?.[1] ?? '';
  console.log(`[gmail simulado] ${usuario.correo} → ${/^To: (.*)$/m.exec(mime)?.[1]} (${asunto}, ${mime.length} bytes)`);
  return { id: `simulado-${Date.now()}`, threadId: `simulado-${Date.now()}` };
};

/** El enviador según GMAIL_MODO del .env. */
export const obtenerEnviador = (): EnviarCorreoGmail => (env.GMAIL_MODO === 'simulado' ? enviarSimulado : enviarCorreoGmail);

export const enviarCorreoGmail: EnviarCorreoGmail = async (usuario, mime) => {
  const token = await obtenerAccessToken(usuario);
  const res = await fetch(URL_ENVIO, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'message/rfc822' },
    body: mime,
  });

  const cuerpo = (await res.json().catch(() => null)) as
    | (ResultadoGmail & { error?: { message?: string; errors?: { reason?: string }[] } })
    | null;

  if (!res.ok || !cuerpo?.id) {
    const razones = cuerpo?.error?.errors?.map((e) => e.reason ?? '').filter(Boolean) ?? [];
    throw new ErrorGmail(res.status, razones, cuerpo?.error?.message ?? `HTTP ${res.status}`);
  }
  return { id: cuerpo.id, threadId: cuerpo.threadId };
};
