import { Router } from 'express';
import {
  cambiarEstadoSchema,
  confirmarImportacionSchema,
  empresaSchema,
  posponerSeguimientoSchema,
  tablaImportacionSchema,
} from '@ep/shared';
import { requireAuth } from '../../middlewares/auth';
import { uploadCsv } from '../../middlewares/uploadCsv';
import { validarBody } from '../../middlewares/validate';
import { empresasController } from './empresas.controller';

export const empresasRoutes = Router();

empresasRoutes.use(requireAuth);

empresasRoutes.get('/', empresasController.listar);
empresasRoutes.post('/', validarBody(empresaSchema), empresasController.crear);

empresasRoutes.get('/resumen-estados', empresasController.resumenEstados);
empresasRoutes.get('/opciones-filtro', empresasController.opcionesFiltro);
empresasRoutes.get('/por-contactar', empresasController.porContactar);
empresasRoutes.post('/estado', validarBody(cambiarEstadoSchema), empresasController.cambiarEstado);
empresasRoutes.post('/posponer-seguimiento', validarBody(posponerSeguimientoSchema), empresasController.posponerSeguimiento);

empresasRoutes.post('/importar/previsualizar', uploadCsv, empresasController.previsualizarCsv);
empresasRoutes.post('/importar/previsualizar-tabla', validarBody(tablaImportacionSchema), empresasController.previsualizarTabla);
empresasRoutes.post('/importar', validarBody(confirmarImportacionSchema), empresasController.importar);

empresasRoutes.get('/:id', empresasController.obtener);
empresasRoutes.put('/:id', validarBody(empresaSchema), empresasController.actualizar);
empresasRoutes.delete('/:id', empresasController.eliminar);
