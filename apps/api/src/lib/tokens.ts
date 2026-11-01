import { env } from '../config/env';
import { cifrar, descifrar } from './crypto';

const clave = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'base64');

export const cifrarToken = (token: string) => cifrar(token, clave);
export const descifrarToken = (valor: string) => descifrar(valor, clave);
