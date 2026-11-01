import multer from 'multer';
import { HOJA_VIDA_MAX_BYTES } from '@ep/shared';
import { AppError } from '../errors/AppError';

/** Recibe un único PDF en memoria (campo `archivo`). El contenido se valida después con `esPdf`. */
export const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: HOJA_VIDA_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(AppError.solicitudInvalida('La hoja de vida debe ser un archivo PDF'));
      return;
    }
    cb(null, true);
  },
}).single('archivo');

/** El mimetype lo envía el navegador y se puede falsificar: revisamos la firma del archivo. */
export function esPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}
