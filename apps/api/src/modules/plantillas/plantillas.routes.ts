import { Router } from 'express';
import { plantillaSchema } from '@ep/shared';
import { requireAuth } from '../../middlewares/auth';
import { validarBody } from '../../middlewares/validate';
import { plantillasController } from './plantillas.controller';

export const plantillasRoutes = Router();

plantillasRoutes.use(requireAuth);

plantillasRoutes.get('/', plantillasController.listar);
plantillasRoutes.post('/', validarBody(plantillaSchema), plantillasController.crear);
plantillasRoutes.get('/:id', plantillasController.obtener);
plantillasRoutes.put('/:id', validarBody(plantillaSchema), plantillasController.actualizar);
plantillasRoutes.delete('/:id', plantillasController.eliminar);
