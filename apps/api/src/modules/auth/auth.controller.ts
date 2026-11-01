import type { Request, Response } from 'express';
import { env } from '../../config/env';
import { cerrarSesion, crearSesion, opcionesCookie } from '../../middlewares/auth';
import { authService } from './auth.service';

const COOKIE_STATE = 'ep_oauth_state';

function redirigirAlLogin(res: Response, error: string) {
  res.redirect(`${env.FRONTEND_URL}/login?error=${encodeURIComponent(error)}`);
}

export const authController = {
  iniciarLogin(_req: Request, res: Response) {
    const state = authService.generarState();
    res.cookie(COOKIE_STATE, state, { ...opcionesCookie, maxAge: 10 * 60 * 1000 });
    res.redirect(authService.urlLogin(state));
  },

  async callback(req: Request, res: Response) {
    const { code, state, error } = req.query;
    const stateGuardado: unknown = req.cookies?.[COOKIE_STATE];
    res.clearCookie(COOKIE_STATE, opcionesCookie);

    if (error === 'access_denied') return redirigirAlLogin(res, 'acceso_denegado');
    if (typeof code !== 'string' || typeof state !== 'string' || state !== stateGuardado) {
      return redirigirAlLogin(res, 'state_invalido');
    }

    try {
      const usuarioId = await authService.procesarCallback(code);
      crearSesion(res, usuarioId);
      res.redirect(env.FRONTEND_URL);
    } catch (err) {
      console.error('Error en el callback de Google:', err);
      redirigirAlLogin(res, 'error_google');
    }
  },

  logout(_req: Request, res: Response) {
    cerrarSesion(res);
    res.status(204).end();
  },
};
