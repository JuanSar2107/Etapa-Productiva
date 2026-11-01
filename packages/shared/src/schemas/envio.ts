import { z } from 'zod';

export const ESTADOS_ENVIO = ['PROGRAMADO', 'ENVIANDO', 'ENVIADO', 'ERROR', 'CANCELADO'] as const;
export type EstadoEnvio = (typeof ESTADOS_ENVIO)[number];

export const ETIQUETAS_ESTADO_ENVIO: Record<EstadoEnvio, string> = {
  PROGRAMADO: 'Programado',
  ENVIANDO: 'Enviando',
  ENVIADO: 'Enviado',
  ERROR: 'Error',
  CANCELADO: 'Cancelado',
};

export const MAX_EMPRESAS_POR_LOTE = 200;

export const encolarEnviosSchema = z.object({
  empresaIds: z
    .array(z.string().min(1))
    .min(1, 'Selecciona al menos una empresa')
    .max(MAX_EMPRESAS_POR_LOTE, `Máximo ${MAX_EMPRESAS_POR_LOTE} empresas por lote`),
  plantillaId: z.string({ error: 'Elige una plantilla' }).min(1, 'Elige una plantilla'),
  /** Permite volver a escribir a empresas a las que ya se les envió (seguimiento). */
  reenviar: z.boolean().default(false),
});
export type EncolarEnviosInput = z.input<typeof encolarEnviosSchema>;

export const listarEnviosSchema = z.object({
  estado: z.enum(ESTADOS_ENVIO).optional(),
  empresaId: z.string().min(1).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListarEnviosQuery = z.input<typeof listarEnviosSchema>;
