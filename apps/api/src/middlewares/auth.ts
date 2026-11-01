import type { CookieOptions, NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../errors/AppError';

export const COOKIE_SESION = 'ep_sesion';
const DURACION_SESION_SEG = 7 * 24 * 60 * 60;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuarioId?: string;
    }
  }
}

export const opcionesCookie: CookieOptions = {
  httpOnly: true,
  secure: env.esProduccion,
  sameSite: 'lax',
  path: '/',
};

export function crearSesion(res: Response, usuarioId: string) {
  const token = jwt.sign({}, env.JWT_SECRET, { subject: usuarioId, expiresIn: DURACION_SESION_SEG });
  res.cookie(COOKIE_SESION, token, { ...opcionesCookie, maxAge: DURACION_SESION_SEG * 1000 });
}

export function cerrarSesion(res: Response) {
  res.clearCookie(COOKIE_SESION, opcionesCookie);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[COOKIE_SESION];
  if (typeof token !== 'string') return next(AppError.noAutenticado());

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) throw new Error('payload inválido');
    req.usuarioId = payload.sub;
    next();
  } catch {
    next(AppError.noAutenticado('Tu sesión expiró. Inicia sesión de nuevo.'));
  }
}

/** Devuelve el id del usuario autenticado; solo usar en rutas protegidas con requireAuth. */
export function usuarioActual(req: Request): string {
  if (!req.usuarioId) throw AppError.noAutenticado();
  return req.usuarioId;
}
