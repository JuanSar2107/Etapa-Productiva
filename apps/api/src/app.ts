import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { AppError } from './errors/AppError';
import { errorHandler } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
import { empresasRoutes } from './modules/empresas/empresas.routes';
import { enviosRoutes } from './modules/envios/envios.routes';
import { plantillasRoutes } from './modules/plantillas/plantillas.routes';
import { usuariosRoutes } from './modules/usuarios/usuarios.routes';

export function crearApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' })); // la confirmación de importación puede traer hasta 2000 empresas
  app.use(cookieParser());

  app.get('/api/salud', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/empresas', empresasRoutes);
  app.use('/api/plantillas', plantillasRoutes);
  app.use('/api/envios', enviosRoutes);

  app.use('/api', (_req, _res, next) => next(AppError.noEncontrado('Ruta no encontrada')));
  app.use(errorHandler);

  return app;
}
