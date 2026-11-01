import path from 'node:path';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.url().default('http://localhost:5173'),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, {
      message: 'TOKEN_ENCRYPTION_KEY debe ser 32 bytes codificados en base64',
    }),

  STORAGE_DIR: z.string().default('./storage'),

  // "simulado" no llama a Gmail (útil para probar); "real" envía de verdad.
  GMAIL_MODO: z.enum(['real', 'simulado']).default('real'),
  COLA_ACTIVA: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
});

const resultado = envSchema.safeParse(process.env);

if (!resultado.success) {
  console.error('❌ Variables de entorno inválidas. Revisa apps/api/.env (usa .env.example como guía):');
  for (const issue of resultado.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = {
  ...resultado.data,
  STORAGE_DIR: path.resolve(resultado.data.STORAGE_DIR),
  esProduccion: resultado.data.NODE_ENV === 'production',
};
