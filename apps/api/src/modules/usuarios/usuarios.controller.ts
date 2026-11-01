import type { Request, Response } from 'express';
import { cerrarSesion, usuarioActual } from '../../middlewares/auth';
import { usuariosService } from './usuarios.service';

export const usuariosController = {
  async perfil(req: Request, res: Response) {
    res.json(await usuariosService.perfil(usuarioActual(req)));
  },

  async actualizarPerfil(req: Request, res: Response) {
    res.json(await usuariosService.actualizarPerfil(usuarioActual(req), req.body));
  },

  async actualizarConfiguracion(req: Request, res: Response) {
    res.json(await usuariosService.actualizarConfiguracion(usuarioActual(req), req.body));
  },

  async aceptarAutorizacionDatos(req: Request, res: Response) {
    res.json(await usuariosService.aceptarAutorizacionDatos(usuarioActual(req)));
  },

  async subirHojaVida(req: Request, res: Response) {
    res.json(await usuariosService.guardarHojaVida(usuarioActual(req), req.file));
  },

  async descargarHojaVida(req: Request, res: Response) {
    const { nombre, stream } = await usuariosService.hojaVida(usuarioActual(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombre}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  },

  async eliminarHojaVida(req: Request, res: Response) {
    res.json(await usuariosService.eliminarHojaVida(usuarioActual(req)));
  },

  async eliminarCuenta(req: Request, res: Response) {
    await usuariosService.eliminarCuenta(usuarioActual(req));
    cerrarSesion(res);
    res.status(204).end();
  },
};
