import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

/** Valida y reemplaza `req.body` con el resultado del esquema (los errores los formatea errorHandler). */
export const validarBody =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
