import { randomBytes } from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { crearClienteOAuth, SCOPES_LOGIN } from '../../lib/googleOAuth';
import { cifrarToken } from '../../lib/tokens';
import { usuariosRepository } from '../usuarios/usuarios.repository';

export const authService = {
  generarState: () => randomBytes(32).toString('hex'),

  urlLogin(state: string): string {
    return crearClienteOAuth().generateAuthUrl({
      access_type: 'offline', // necesario para recibir refresh_token y enviar correos desde la cola
      prompt: 'consent', // garantiza que Google entregue refresh_token en cada login
      include_granted_scopes: true,
      scope: SCOPES_LOGIN,
      state,
    });
  },

  /** Intercambia el código de Google por tokens, crea o actualiza el usuario y devuelve su id. */
  async procesarCallback(code: string): Promise<string> {
    const cliente = crearClienteOAuth();
    const { tokens } = await cliente.getToken(code);
    if (!tokens.id_token || !tokens.access_token) {
      throw AppError.solicitudInvalida('Google no devolvió los tokens esperados');
    }

    const ticket = await cliente.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    const perfil = ticket.getPayload();
    if (!perfil?.sub || !perfil.email || !perfil.email_verified) {
      throw AppError.solicitudInvalida('La cuenta de Google no tiene un correo verificado');
    }

    const datosTokens = {
      accessTokenCifrado: cifrarToken(tokens.access_token),
      // Google solo envía refresh_token en algunos casos; si no llega conservamos el anterior.
      ...(tokens.refresh_token && { refreshTokenCifrado: cifrarToken(tokens.refresh_token) }),
      tokenExpiraEn: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scopes: tokens.scope ?? null,
      requiereReconexion: false,
    };

    const existente = await usuariosRepository.buscarPorGoogleId(perfil.sub);
    if (existente) {
      await usuariosRepository.actualizar(existente.id, { correo: perfil.email.toLowerCase(), ...datosTokens });
      return existente.id;
    }

    const nuevo = await usuariosRepository.crear({
      googleId: perfil.sub,
      correo: perfil.email.toLowerCase(),
      nombre: perfil.name ?? perfil.email,
      ...datosTokens,
    });
    return nuevo.id;
  },
};
