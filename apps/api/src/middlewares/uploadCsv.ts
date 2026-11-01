import multer from 'multer';
import { MAX_BYTES_CSV } from '@ep/shared';
import { AppError } from '../errors/AppError';

/**
 * Recibe un único CSV en memoria (campo `archivo`). Validamos por extensión porque
 * cada sistema operativo reporta un mimetype distinto (text/csv, application/vnd.ms-excel…).
 */
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES_CSV, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      cb(AppError.solicitudInvalida('El archivo debe tener extensión .csv (en Excel: Guardar como → CSV UTF-8)'));
      return;
    }
    cb(null, true);
  },
}).single('archivo');
