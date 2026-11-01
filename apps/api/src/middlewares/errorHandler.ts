import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { codigo: err.codigo, mensaje: err.message, detalles: err.detalles } });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        codigo: 'VALIDACION',
        mensaje: 'Hay campos con errores',
        detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const mensaje =
      err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el tamaño máximo permitido' : 'No se pudo procesar el archivo';
    res.status(400).json({ error: { codigo: 'ARCHIVO_INVALIDO', mensaje } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: { codigo: 'DUPLICADO', mensaje: 'Ya existe un registro con esos datos' } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado' } });
};
