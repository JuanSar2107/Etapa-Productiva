import { parse } from 'csv-parse/sync';
import {
  empresaSchema,
  esCorreoPersonal,
  MAX_FILAS_CSV,
  type EmpresaDatos,
  type FilaImportacion,
  type PrevisualizacionCsv,
} from '@ep/shared';
import { AppError } from '../../errors/AppError';

type Campo = keyof EmpresaDatos;

/** Nombres de columna aceptados (ya normalizados: minúsculas, sin tildes ni espacios). */
const ALIAS: Record<Campo, string[]> = {
  nombre: ['nombre', 'empresa', 'nombreempresa', 'nombredelaempresa', 'razonsocial'],
  nit: ['nit', 'nitempresa'],
  sector: ['sector', 'sectoreconomico', 'actividad', 'actividadeconomica'],
  ciudad: ['ciudad', 'municipio'],
  correoContacto: ['correo', 'email', 'mail', 'correoelectronico', 'correocontacto', 'correodecontacto', 'emailcontacto'],
  sitioWeb: ['sitioweb', 'sitio', 'web', 'paginaweb', 'pagina', 'url'],
  notas: ['notas', 'observaciones', 'comentarios'],
};

const normalizarEncabezado = (h: string) =>
  h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const CAMPO_POR_ALIAS = new Map(
  (Object.entries(ALIAS) as [Campo, string[]][]).flatMap(([campo, alias]) => alias.map((a) => [a, campo] as const)),
);

/** Excel en español suele guardar CSV en Windows-1252; si no es UTF-8 válido, usamos esa codificación. */
export function decodificar(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

/** Excel en español usa ";" como separador; elegimos el que más aparece en la primera línea. */
function detectarSeparador(texto: string): ',' | ';' {
  const primera = texto.split(/\r?\n/, 1)[0] ?? '';
  const contar = (c: string) => primera.split(c).length;
  return contar(';') > contar(',') ? ';' : ',';
}

/** Si la celda trae varios correos ("a@x.com; b@x.com"), usamos el primero. */
function primerCorreo(valor: string): { correo: string; habiaVarios: boolean } {
  const partes = valor.split(/[\s,;/]+/).filter((p) => p.includes('@'));
  return { correo: partes[0] ?? valor, habiaVarios: partes.length > 1 };
}

export interface Existentes {
  correos: Set<string>;
  nits: Set<string>;
}

export function analizarCsv(buffer: Buffer, existentes: Existentes): PrevisualizacionCsv {
  const texto = decodificar(buffer);

  let registros: string[][];
  try {
    registros = parse(texto, {
      bom: true,
      delimiter: detectarSeparador(texto),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
  } catch (err) {
    throw AppError.solicitudInvalida(`No se pudo leer el CSV: ${(err as Error).message}`);
  }

  const [encabezado, ...datos] = registros;
  if (!encabezado || datos.length === 0) {
    throw AppError.solicitudInvalida('El archivo está vacío o solo tiene el encabezado');
  }
  return analizarTabla(encabezado, datos, existentes);
}

const limpiarCelda = (c: string | undefined) => (c ?? '').replace(/\s+/g, ' ').trim();

/**
 * Analiza una tabla ya separada en celdas: sirve para el CSV, para una tabla pegada
 * desde el navegador y para la que envía la extensión desde la página del SGVA.
 */
export function analizarTabla(encabezadoOriginal: string[], datosOriginales: string[][], existentes: Existentes): PrevisualizacionCsv {
  // Las tablas de páginas web traen saltos de línea, espacios dobles y filas vacías.
  const encabezado = encabezadoOriginal.map(limpiarCelda);
  const datos = datosOriginales.map((f) => f.map(limpiarCelda)).filter((f) => f.some((c) => c !== ''));
  if (datos.length === 0) {
    throw AppError.solicitudInvalida('La tabla no tiene filas con datos');
  }
  if (datos.length > MAX_FILAS_CSV) {
    throw AppError.solicitudInvalida(`La tabla tiene ${datos.length} filas; el máximo es ${MAX_FILAS_CSV}`);
  }

  const columnas: Record<string, Campo> = {};
  const columnasIgnoradas: string[] = [];
  const indices: Partial<Record<Campo, number>> = {};
  encabezado.forEach((h, i) => {
    const campo = CAMPO_POR_ALIAS.get(normalizarEncabezado(h));
    if (campo && indices[campo] === undefined) {
      indices[campo] = i;
      columnas[h] = campo;
    } else if (h) {
      columnasIgnoradas.push(h);
    }
  });

  if (indices.nombre === undefined || indices.correoContacto === undefined) {
    throw AppError.solicitudInvalida(
      'La tabla debe tener al menos las columnas "nombre" y "correo". Columnas opcionales: nit, sector, ciudad, sitio_web, notas.',
      { encabezado },
    );
  }

  const correosVistos = new Map<string, number>();
  const nitsVistos = new Map<string, number>();

  const filas = datos.map((registro, i): FilaImportacion => {
    const numeroFila = i + 2;
    const original = Object.fromEntries(encabezado.map((h, j) => [h, registro[j] ?? '']));
    // Las columnas que no vienen en el archivo quedan en '' y el esquema las convierte en null.
    const crudo = Object.fromEntries(
      (Object.keys(ALIAS) as Campo[]).map((campo) => {
        const j = indices[campo];
        return [campo, j === undefined ? '' : (registro[j] ?? '')];
      }),
    ) as Record<Campo, string>;

    const avisos: string[] = [];
    if (crudo.correoContacto) {
      const { correo, habiaVarios } = primerCorreo(crudo.correoContacto);
      if (habiaVarios) avisos.push(`La celda tenía varios correos; se usará ${correo}`);
      crudo.correoContacto = correo;
    }

    const r = empresaSchema.safeParse(crudo);
    if (!r.success) {
      return {
        fila: numeroFila,
        resultado: 'invalida',
        original,
        errores: r.error.issues.map((iss) => iss.message),
        avisos,
      };
    }
    const empresa = r.data;

    const filaPrevia = correosVistos.get(empresa.correoContacto);
    if (existentes.correos.has(empresa.correoContacto) || filaPrevia) {
      return {
        fila: numeroFila,
        resultado: 'duplicada',
        original,
        errores: [filaPrevia ? `Correo repetido (fila ${filaPrevia})` : 'Ya tienes una empresa con este correo'],
        avisos,
      };
    }
    correosVistos.set(empresa.correoContacto, numeroFila);

    if (empresa.nit) {
      const nitPrevio = nitsVistos.get(empresa.nit);
      if (existentes.nits.has(empresa.nit)) avisos.push('Ya tienes otra empresa con este NIT');
      else if (nitPrevio) avisos.push(`Mismo NIT que la fila ${nitPrevio}`);
      nitsVistos.set(empresa.nit, numeroFila);
    }
    if (esCorreoPersonal(empresa.correoContacto)) {
      avisos.push('Es un correo personal (Gmail, Hotmail…): verifica que la empresa lo publique como contacto');
    }

    return { fila: numeroFila, resultado: 'valida', original, empresa, errores: [], avisos };
  });

  const contar = (r: FilaImportacion['resultado']) => filas.filter((f) => f.resultado === r).length;
  return {
    columnas,
    columnasIgnoradas,
    filas,
    resumen: { total: filas.length, validas: contar('valida'), invalidas: contar('invalida'), duplicadas: contar('duplicada') },
  };
}
