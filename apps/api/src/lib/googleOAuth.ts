import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';

/**
 * Permisos mínimos: identidad del usuario + enviar correos desde su cuenta.
 * `gmail.readonly` (detectar respuestas) se pedirá aparte cuando exista esa función.
 */
export const SCOPES_LOGIN = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/gmail.send',
];

export function crearClienteOAuth(): OAuth2Client {
  return new OAuth2Client({
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
  });
}
