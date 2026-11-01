const formato = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/** "mar, 3 nov, 9:06 a. m." en hora de Colombia. */
export const formatearFecha = (iso: string | null | undefined) => (iso ? formato.format(new Date(iso)) : '—');

const formatoDia = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });

/** "7 dic 2026" para fechas sin hora como "2026-12-07" (se leen en UTC para no correrse un día). */
export const formatearDia = (fecha: string) => formatoDia.format(new Date(`${fecha}T00:00:00Z`));

/** Días que faltan hasta una fecha "2026-12-07" (negativo si ya pasó). */
export function diasHasta(fecha: string, hoy = new Date()) {
  const hoyLocal = new Date(hoy.getTime() - 5 * 3600e3).toISOString().slice(0, 10);
  return Math.round((Date.parse(`${fecha}T00:00:00Z`) - Date.parse(`${hoyLocal}T00:00:00Z`)) / 864e5);
}
