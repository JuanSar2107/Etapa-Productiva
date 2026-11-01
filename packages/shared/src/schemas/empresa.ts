import { z } from 'zod';

export const ESTADOS_CONTACTO = ['SIN_CONTACTAR', 'PENDIENTE', 'ENVIADO', 'RESPONDIO', 'RECHAZADO', 'NO_CONTACTAR'] as const;
export type EstadoContacto = (typeof ESTADOS_CONTACTO)[number];

export const ETIQUETAS_ESTADO: Record<EstadoContacto, string> = {
  SIN_CONTACTAR: 'Sin contactar',
  PENDIENTE: 'En cola',
  ENVIADO: 'Enviado',
  RESPONDIO: 'Respondió',
  RECHAZADO: 'Rechazado',
  NO_CONTACTAR: 'No contactar',
};

export const FUENTES_EMPRESA = ['MANUAL', 'CSV', 'EXTENSION'] as const;
export type FuenteEmpresa = (typeof FUENTES_EMPRESA)[number];

/** Convierte '' y espacios en null para que los campos opcionales vacíos no se guarden como texto vacío. */
const vacioANull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

const textoOpcional = (max: number) =>
  z.preprocess(vacioANull, z.string().trim().max(max, `Máximo ${max} caracteres`).nullable().optional());

export const correoSchema = z
  .string({ error: 'El correo es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Correo no válido'));

/** NIT colombiano: se quitan puntos y espacios; el dígito de verificación es opcional (900123456-7). */
const nitSchema = z.preprocess(
  (v) => (typeof v === 'string' ? vacioANull(v.replace(/[.\s]/g, '')) : v),
  z
    .string()
    .regex(/^\d{6,12}(-\d)?$/, 'NIT no válido (ejemplo: 900123456-7)')
    .nullable()
    .optional(),
);

/** Acepta "empresa.com" y le agrega https:// */
const sitioWebSchema = z.preprocess(
  (v) => {
    const limpio = vacioANull(v);
    if (typeof limpio !== 'string') return limpio;
    const t = limpio.trim();
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  },
  z
    .url({ protocol: /^https?$/, error: 'Sitio web no válido' })
    .max(300)
    .nullable()
    .optional(),
);

export const empresaSchema = z.object({
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'El nombre es muy corto').max(150),
  nit: nitSchema,
  sector: textoOpcional(100),
  ciudad: textoOpcional(100),
  correoContacto: correoSchema,
  sitioWeb: sitioWebSchema,
  notas: textoOpcional(2000),
});
/** Datos de una empresa ya validados y normalizados. */
export type EmpresaDatos = z.output<typeof empresaSchema>;

export const ORDENES_EMPRESAS = ['recientes', 'nombre', 'ultimoContacto', 'seguimiento'] as const;
export type OrdenEmpresas = (typeof ORDENES_EMPRESAS)[number];

export const ETIQUETAS_ORDEN: Record<OrdenEmpresas, string> = {
  recientes: 'Agregadas recientemente',
  nombre: 'Nombre (A–Z)',
  ultimoContacto: 'Contactadas recientemente',
  seguimiento: 'Seguimiento más antiguo primero',
};

export const listarEmpresasSchema = z.object({
  q: z.string().trim().max(100).optional(),
  estado: z.enum(ESTADOS_CONTACTO).optional(),
  ciudad: z.string().trim().max(100).optional(),
  sector: z.string().trim().max(100).optional(),
  orden: z.enum(ORDENES_EMPRESAS).default('recientes'),
  /** "pendiente": solo empresas a las que ya toca hacer seguimiento. */
  seguimiento: z.enum(['pendiente']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

/** PENDIENTE ("en cola") solo lo asigna la cola de envíos; el resto se puede poner a mano. */
export const ESTADOS_MANUALES = ESTADOS_CONTACTO.filter((e) => e !== 'PENDIENTE') as Exclude<EstadoContacto, 'PENDIENTE'>[];

export const cambiarEstadoSchema = z.object({
  empresaIds: z.array(z.string().min(1)).min(1, 'Selecciona al menos una empresa').max(500),
  estado: z.enum(ESTADOS_MANUALES as [Exclude<EstadoContacto, 'PENDIENTE'>, ...Exclude<EstadoContacto, 'PENDIENTE'>[]], {
    error: '"En cola" lo asigna la app al programar un correo',
  }),
});
export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;

export const posponerSeguimientoSchema = z.object({
  empresaIds: z.array(z.string().min(1)).min(1, 'Selecciona al menos una empresa').max(500),
  dias: z.number().int().min(1).max(60),
});
export type PosponerSeguimientoInput = z.infer<typeof posponerSeguimientoSchema>;
export type ListarEmpresasQuery = z.input<typeof listarEmpresasSchema>;

export const MAX_FILAS_CSV = 2000;
export const MAX_BYTES_CSV = 1024 * 1024;

/** Tabla leída de una página web (pegada o enviada por la extensión): encabezado + filas de celdas. */
export const tablaImportacionSchema = z.object({
  encabezado: z.array(z.string().max(200)).min(1).max(50),
  filas: z
    .array(z.array(z.string().max(2000)).max(50))
    .min(1, 'La tabla no tiene filas')
    .max(MAX_FILAS_CSV, `Máximo ${MAX_FILAS_CSV} filas`),
});
export type TablaImportacion = z.infer<typeof tablaImportacionSchema>;

export const confirmarImportacionSchema = z.object({
  empresas: z.array(empresaSchema).min(1, 'No hay empresas para importar').max(MAX_FILAS_CSV),
});

const DOMINIOS_GRATUITOS = new Set([
  'gmail.com',
  'hotmail.com',
  'hotmail.es',
  'outlook.com',
  'outlook.es',
  'live.com',
  'msn.com',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
]);

/**
 * Muchas empresas pequeñas usan Gmail o Hotmail, así que no lo bloqueamos,
 * pero avisamos para que el aprendiz confirme que es un correo publicado por la empresa.
 */
export function esCorreoPersonal(correo: string): boolean {
  const dominio = correo.split('@')[1]?.toLowerCase();
  return !!dominio && DOMINIOS_GRATUITOS.has(dominio);
}
