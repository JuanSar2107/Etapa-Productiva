import type { TablaImportacion } from '@ep/shared';

const textoCelda = (c: Element) => (c.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Toma la tabla HTML con más filas y la convierte en encabezado + filas. */
export function tablaDesdeHtml(html: string): TablaImportacion | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tablas = [...doc.querySelectorAll('table')].sort((a, b) => b.rows.length - a.rows.length);
  const tabla = tablas[0];
  if (!tabla || tabla.rows.length < 2) return null;
  const [encabezado, ...filas] = [...tabla.rows].map((tr) => [...tr.cells].map(textoCelda));
  return { encabezado: encabezado!, filas };
}

/** Texto copiado de una tabla (Excel o navegador): filas separadas por saltos de línea y celdas por tabuladores. */
export function tablaDesdeTexto(texto: string): TablaImportacion | null {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lineas.length < 2 || !lineas[0]!.includes('\t')) return null;
  const [encabezado, ...filas] = lineas.map((l) => l.split('\t').map((c) => c.trim()));
  return { encabezado: encabezado!, filas };
}

/** Lee lo que el usuario pegó: primero intenta la versión HTML (más fiel) y si no, el texto con tabuladores. */
export function tablaDesdePortapapeles(datos: DataTransfer): TablaImportacion | null {
  const html = datos.getData('text/html');
  return (html.includes('<table') ? tablaDesdeHtml(html) : null) ?? tablaDesdeTexto(datos.getData('text/plain'));
}

/**
 * Mensajes entre la página y la extensión (a través de su script puente).
 * La página pide la tabla al cargar; la extensión responde si tiene una pendiente.
 */
export const MENSAJES_EXTENSION = {
  pedirTabla: 'EP_PEDIR_TABLA',
  tabla: 'EP_TABLA',
  recibida: 'EP_TABLA_RECIBIDA',
} as const;
