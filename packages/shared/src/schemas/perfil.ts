import { z } from 'zod';

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const actualizarPerfilSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre es muy corto').max(120),
  programaFormacion: textoOpcional(150),
  ficha: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, 'La ficha debe tener solo números (4 a 10 dígitos)')
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  telefono: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{7,20}$/, 'Teléfono no válido')
    .or(z.literal(''))
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
});
export type ActualizarPerfilInput = z.input<typeof actualizarPerfilSchema>;

export const configuracionEnvioSchema = z
  .object({
    limiteDiario: z.number().int().min(1).max(50),
    espaciadoMinSeg: z.number().int().min(30).max(3600),
    espaciadoMaxSeg: z.number().int().min(30).max(7200),
    diasSeguimiento: z.number().int().min(1).max(60),
  })
  .refine((c) => c.espaciadoMaxSeg >= c.espaciadoMinSeg, {
    message: 'El espaciado máximo debe ser mayor o igual al mínimo',
    path: ['espaciadoMaxSeg'],
  });
export type ConfiguracionEnvioInput = z.infer<typeof configuracionEnvioSchema>;

export const autorizacionDatosSchema = z.object({
  acepta: z.literal(true, { error: 'Debes aceptar la autorización para continuar' }),
});

export const HOJA_VIDA_MAX_BYTES = 5 * 1024 * 1024;
