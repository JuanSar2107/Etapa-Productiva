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
