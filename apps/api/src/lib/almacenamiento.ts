import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { env } from '../config/env';

/**
 * Almacenamiento de archivos privados. Hoy guarda en disco local; para producción
 * se puede cambiar por S3 o Google Cloud Storage implementando esta misma interfaz.
 */
export interface Almacenamiento {
  guardar(clave: string, contenido: Buffer): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  abrirStream(clave: string): Readable;
  eliminar(clave: string): Promise<void>;
}

function rutaSegura(clave: string): string {
  const ruta = path.resolve(env.STORAGE_DIR, clave);
  if (!ruta.startsWith(env.STORAGE_DIR + path.sep)) {
    throw new Error(`Clave de almacenamiento fuera del directorio permitido: ${clave}`);
  }
  return ruta;
}

export const almacenamientoLocal: Almacenamiento = {
  async guardar(clave, contenido) {
    const ruta = rutaSegura(clave);
    await fs.mkdir(path.dirname(ruta), { recursive: true });
    await fs.writeFile(ruta, contenido);
  },
  leer: (clave) => fs.readFile(rutaSegura(clave)),
  abrirStream: (clave) => createReadStream(rutaSegura(clave)),
  async eliminar(clave) {
    await fs.rm(rutaSegura(clave), { force: true });
  },
};

export const almacenamiento: Almacenamiento = almacenamientoLocal;
