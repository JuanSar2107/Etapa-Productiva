import { z } from 'zod';

export const VARIABLES_PLANTILLA = ['empresa', 'nombre', 'programa', 'ficha', 'telefono'] as const;
export type VariablePlantilla = (typeof VARIABLES_PLANTILLA)[number];

export const DESCRIPCION_VARIABLES: Record<VariablePlantilla, string> = {
  empresa: 'Nombre de la empresa',
  nombre: 'Tu nombre',
  programa: 'Tu programa de formación',
  ficha: 'Tu número de ficha',
  telefono: 'Tu teléfono',
};

/** Línea que se agrega al final si la plantilla la tiene activada (buena práctica y respeto a la Ley 1581). */
export const LINEA_EXCLUSION =
  'Si prefiere no recibir más mensajes míos, responda a este correo con las palabras «NO CONTACTAR» y no volveré a escribirle.';

// Acepta {empresa} y también { empresa }, sin distinguir mayúsculas.
const PATRON_VARIABLE = /\{\s*([a-zA-Z_áéíóúñ]+)\s*\}/g;

const esVariable = (v: string): v is VariablePlantilla => (VARIABLES_PLANTILLA as readonly string[]).includes(v);

/** Variables escritas entre llaves que no existen (por ejemplo {nombre_empresa}). */
export function variablesDesconocidas(texto: string): string[] {
  const desconocidas = [...texto.matchAll(PATRON_VARIABLE)]
    .map((m) => m[1]!.toLowerCase())
    .filter((v) => !esVariable(v));
  return [...new Set(desconocidas)];
}

export type ValoresPlantilla = Partial<Record<VariablePlantilla, string | null | undefined>>;

export interface CorreoRenderizado {
  asunto: string;
  cuerpo: string;
  /** Variables usadas que no tienen valor; se dejan sin reemplazar para que se noten. */
  faltantes: VariablePlantilla[];
}

export function renderizarPlantilla(
  plantilla: { asunto: string; cuerpo: string; incluirLineaExclusion: boolean },
  valores: ValoresPlantilla,
): CorreoRenderizado {
  const faltantes = new Set<VariablePlantilla>();
  const reemplazar = (texto: string) =>
    texto.replace(PATRON_VARIABLE, (original, nombre: string) => {
      const variable = nombre.toLowerCase();
      if (!esVariable(variable)) return original;
      const valor = valores[variable]?.trim();
      if (!valor) {
        faltantes.add(variable);
        return original;
      }
      return valor;
    });

  const asunto = reemplazar(plantilla.asunto).replace(/\s+/g, ' ').trim();
  let cuerpo = reemplazar(plantilla.cuerpo).trim();
  if (plantilla.incluirLineaExclusion) cuerpo += `\n\n--\n${LINEA_EXCLUSION}`;

  return { asunto, cuerpo, faltantes: [...faltantes] };
}

const sinVariablesDesconocidas = (texto: string) => variablesDesconocidas(texto).length === 0;
const mensajeDesconocidas = (texto: string) =>
  `Variable desconocida: ${variablesDesconocidas(texto)
    .map((v) => `{${v}}`)
    .join(', ')}. Usa solo ${VARIABLES_PLANTILLA.map((v) => `{${v}}`).join(', ')}`;

export const plantillaSchema = z.object({
  nombre: z.string({ error: 'El nombre es obligatorio' }).trim().min(2, 'El nombre es muy corto').max(80),
  asunto: z
    .string({ error: 'El asunto es obligatorio' })
    .trim()
    .min(3, 'El asunto es muy corto')
    .max(200, 'Máximo 200 caracteres')
    .refine((v) => !/[\r\n]/.test(v), 'El asunto no puede tener saltos de línea')
    .refine(sinVariablesDesconocidas, { error: (iss) => mensajeDesconocidas(String(iss.input)) }),
  cuerpo: z
    .string({ error: 'El cuerpo es obligatorio' })
    .trim()
    .min(20, 'El mensaje es muy corto')
    .max(10000, 'Máximo 10.000 caracteres')
    .refine(sinVariablesDesconocidas, { error: (iss) => mensajeDesconocidas(String(iss.input)) }),
  incluirLineaExclusion: z.boolean().default(true),
});
export type PlantillaDatos = z.output<typeof plantillaSchema>;

/** Texto sugerido para escribir de nuevo a una empresa que no respondió. */
export const PLANTILLA_SEGUIMIENTO_SUGERIDA: PlantillaDatos = {
  nombre: 'Seguimiento',
  asunto: 'Seguimiento: aprendiz SENA de {programa} – etapa productiva',
  cuerpo: `Buenos días, equipo de {empresa}:

Hace unos días les escribí para presentarme como aprendiz del SENA en {programa} (ficha {ficha}) y expresar mi interés en realizar mi etapa productiva con ustedes.

Quería saber si tuvieron la oportunidad de revisar mi hoja de vida, que adjunto nuevamente. Si en este momento no tienen vacantes para aprendices, les agradezco que me lo hagan saber.

Quedo atento(a) a su respuesta; también pueden comunicarse conmigo al {telefono}.

Cordialmente,
{nombre}`,
  incluirLineaExclusion: true,
};

/** Texto sugerido para la primera plantilla. */
export const PLANTILLA_SUGERIDA: PlantillaDatos = {
  nombre: 'Solicitud de etapa productiva',
  asunto: 'Aprendiz SENA de {programa} – solicitud de etapa productiva',
  cuerpo: `Buenos días, equipo de {empresa}:

Mi nombre es {nombre} y soy aprendiz del SENA en el programa {programa} (ficha {ficha}). Estoy buscando una empresa para realizar mi etapa productiva y me gustaría mucho hacerla con ustedes.

Adjunto mi hoja de vida. Quedo atento(a) a cualquier información o proceso que deba seguir; también pueden comunicarse conmigo al {telefono}.

Muchas gracias por su tiempo.

Cordialmente,
{nombre}
{telefono}`,
  incluirLineaExclusion: true,
};
