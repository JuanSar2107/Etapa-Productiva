import { Router } from 'express';
import { actualizarPerfilSchema, autorizacionDatosSchema, configuracionEnvioSchema } from '@ep/shared';
import { requireAuth } from '../../middlewares/auth';
import { uploadPdf } from '../../middlewares/uploadPdf';
import { validarBody } from '../../middlewares/validate';
import { usuariosController } from './usuarios.controller';

export const usuariosRoutes = Router();

usuariosRoutes.use(requireAuth);

usuariosRoutes.get('/me', usuariosController.perfil);
usuariosRoutes.patch('/me', validarBody(actualizarPerfilSchema), usuariosController.actualizarPerfil);
usuariosRoutes.delete('/me', usuariosController.eliminarCuenta);

usuariosRoutes.put('/me/configuracion', validarBody(configuracionEnvioSchema), usuariosController.actualizarConfiguracion);
usuariosRoutes.post('/me/autorizacion-datos', validarBody(autorizacionDatosSchema), usuariosController.aceptarAutorizacionDatos);

usuariosRoutes.put('/me/hoja-vida', uploadPdf, usuariosController.subirHojaVida);
usuariosRoutes.get('/me/hoja-vida', usuariosController.descargarHojaVida);
usuariosRoutes.delete('/me/hoja-vida', usuariosController.eliminarHojaVida);
