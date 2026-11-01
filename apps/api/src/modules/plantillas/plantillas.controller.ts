import type { Request, Response } from 'express';
import { usuarioActual } from '../../middlewares/auth';
import { plantillasService } from './plantillas.service';

const idParam = (req: Request) => String(req.params.id);

export const plantillasController = {
  async listar(req: Request, res: Response) {
    res.json(await plantillasService.listar(usuarioActual(req)));
  },

  async obtener(req: Request, res: Response) {
    res.json(await plantillasService.obtener(usuarioActual(req), idParam(req)));
  },

  async crear(req: Request, res: Response) {
    res.status(201).json(await plantillasService.crear(usuarioActual(req), req.body));
  },

  async actualizar(req: Request, res: Response) {
    res.json(await plantillasService.actualizar(usuarioActual(req), idParam(req), req.body));
  },

  async eliminar(req: Request, res: Response) {
    await plantillasService.eliminar(usuarioActual(req), idParam(req));
    res.status(204).end();
  },
};
