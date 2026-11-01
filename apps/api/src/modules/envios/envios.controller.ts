import type { Request, Response } from 'express';
import { listarEnviosSchema } from '@ep/shared';
import { usuarioActual } from '../../middlewares/auth';
import { enviosService } from './envios.service';

const idParam = (req: Request) => String(req.params.id);

export const enviosController = {
  async encolar(req: Request, res: Response) {
    res.status(201).json(await enviosService.encolar(usuarioActual(req), req.body));
  },

  async enviarPrueba(req: Request, res: Response) {
    res.json(await enviosService.enviarPrueba(usuarioActual(req), req.body));
  },

  async listar(req: Request, res: Response) {
    res.json(await enviosService.listar(usuarioActual(req), listarEnviosSchema.parse(req.query)));
  },

  async resumen(req: Request, res: Response) {
    res.json(await enviosService.resumen(usuarioActual(req)));
  },

  async cancelar(req: Request, res: Response) {
    await enviosService.cancelar(usuarioActual(req), idParam(req));
    res.status(204).end();
  },

  async reintentar(req: Request, res: Response) {
    res.json(await enviosService.reintentar(usuarioActual(req), idParam(req)));
  },
};
