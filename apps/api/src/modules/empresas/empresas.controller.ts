import type { Request, Response } from 'express';
import { listarEmpresasSchema } from '@ep/shared';
import { AppError } from '../../errors/AppError';
import { usuarioActual } from '../../middlewares/auth';
import { empresasRepository } from './empresas.repository';
import { empresasService } from './empresas.service';
import { analizarCsv, analizarTabla } from './importarCsv.service';

const idParam = (req: Request) => String(req.params.id);

export const empresasController = {
  async listar(req: Request, res: Response) {
    res.json(await empresasService.listar(usuarioActual(req), listarEmpresasSchema.parse(req.query)));
  },

  async obtener(req: Request, res: Response) {
    res.json(await empresasService.obtener(usuarioActual(req), idParam(req)));
  },

  async crear(req: Request, res: Response) {
    res.status(201).json(await empresasService.crear(usuarioActual(req), req.body));
  },

  async actualizar(req: Request, res: Response) {
    res.json(await empresasService.actualizar(usuarioActual(req), idParam(req), req.body));
  },

  async resumenEstados(req: Request, res: Response) {
    res.json(await empresasService.resumenEstados(usuarioActual(req)));
  },

  async opcionesFiltro(req: Request, res: Response) {
    res.json(await empresasService.opcionesFiltro(usuarioActual(req)));
  },

  async posponerSeguimiento(req: Request, res: Response) {
    res.json(await empresasService.posponerSeguimiento(usuarioActual(req), req.body));
  },

  async cambiarEstado(req: Request, res: Response) {
    res.json(await empresasService.cambiarEstado(usuarioActual(req), req.body));
  },

  async eliminar(req: Request, res: Response) {
    await empresasService.eliminar(usuarioActual(req), idParam(req));
    res.status(204).end();
  },

  /** Paso 1 de la importación: analiza el CSV sin guardar nada. */
  async previsualizarCsv(req: Request, res: Response) {
    if (!req.file) throw AppError.solicitudInvalida('Adjunta un archivo CSV en el campo "archivo"');
    const usuarioId = usuarioActual(req);
    res.json(analizarCsv(req.file.buffer, await empresasRepository.identificadores(usuarioId)));
  },

  /** Igual que previsualizarCsv, pero con una tabla ya separada en celdas (pegada o de la extensión). */
  async previsualizarTabla(req: Request, res: Response) {
    const usuarioId = usuarioActual(req);
    const { encabezado, filas } = req.body;
    res.json(analizarTabla(encabezado, filas, await empresasRepository.identificadores(usuarioId)));
  },

  /** Paso 2: guarda las filas válidas que el usuario confirmó (vuelven a validarse con Zod). */
  async importar(req: Request, res: Response) {
    res.status(201).json(await empresasService.importar(usuarioActual(req), req.body.empresas));
  },
};
