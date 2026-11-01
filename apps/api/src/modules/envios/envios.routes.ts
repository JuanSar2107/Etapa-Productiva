import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { encolarEnviosSchema, plantillaSchema } from '@ep/shared';
import { requireAuth } from '../../middlewares/auth';
import { validarBody } from '../../middlewares/validate';
import { enviosController } from './envios.controller';

export const enviosRoutes = Router();

enviosRoutes.use(requireAuth);

/** Las pruebas salen de inmediato (sin cola), así que limitamos cuántas se pueden pedir. */
const limitePruebas = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.usuarioId!, // ya pasó por requireAuth: el límite es por aprendiz
  message: { error: { codigo: 'DEMASIADAS_PRUEBAS', mensaje: 'Enviaste muchas pruebas seguidas. Espera unos minutos.' } },
});

enviosRoutes.get('/', enviosController.listar);
enviosRoutes.post('/', validarBody(encolarEnviosSchema), enviosController.encolar);
enviosRoutes.post(
  '/prueba',
  limitePruebas,
  validarBody(plantillaSchema.pick({ asunto: true, cuerpo: true, incluirLineaExclusion: true })),
  enviosController.enviarPrueba,
);
enviosRoutes.get('/resumen', enviosController.resumen);
enviosRoutes.post('/:id/cancelar', enviosController.cancelar);
enviosRoutes.post('/:id/reintentar', enviosController.reintentar);
