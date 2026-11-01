import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cifrar, descifrar } from '../src/lib/crypto';
import { esPdf } from '../src/middlewares/uploadPdf';

describe('cifrado de tokens', () => {
  const clave = randomBytes(32);

  it('descifra lo que cifra', () => {
    const token = '1//0g-refresh-token-de-prueba';
    expect(descifrar(cifrar(token, clave), clave)).toBe(token);
  });

  it('genera un valor distinto cada vez (IV aleatorio)', () => {
    expect(cifrar('abc', clave)).not.toBe(cifrar('abc', clave));
  });

  it('falla con otra clave', () => {
    expect(() => descifrar(cifrar('abc', clave), randomBytes(32))).toThrow();
  });

  it('falla si el valor fue alterado', () => {
    const partes = cifrar('abc', clave).split('.');
    partes[3] = Buffer.from('xyz').toString('base64url');
    expect(() => descifrar(partes.join('.'), clave)).toThrow();
  });
});

describe('esPdf', () => {
  it('reconoce la firma de un PDF', () => {
    expect(esPdf(Buffer.from('%PDF-1.7\n...'))).toBe(true);
  });

  it('rechaza otros archivos', () => {
    expect(esPdf(Buffer.from('MZ\x90\x00'))).toBe(false);
  });
});
