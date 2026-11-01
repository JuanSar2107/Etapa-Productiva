import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITMO = 'aes-256-gcm';
const VERSION = 'v1';

/**
 * Cifra un texto con AES-256-GCM. El resultado tiene la forma
 * `v1.<iv>.<authTag>.<datos>` (cada parte en base64url) para poder rotar
 * el formato más adelante sin romper los valores ya guardados.
 */
export function cifrar(texto: string, clave: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITMO, clave, iv);
  const datos = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, datos].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

export function descifrar(valor: string, clave: Buffer): string {
  const [version, iv, tag, datos] = valor.split('.');
  if (version !== VERSION || !iv || !tag || !datos) {
    throw new Error('Formato de valor cifrado no reconocido');
  }
  const decipher = createDecipheriv(ALGORITMO, clave, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(datos, 'base64url')), decipher.final()]).toString('utf8');
}
