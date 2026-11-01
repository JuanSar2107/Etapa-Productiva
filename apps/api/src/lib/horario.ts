/**
 * Utilidades de fecha en hora de Colombia (UTC-5, sin horario de verano).
 * Trabajamos con un desfase fijo para no depender de la zona horaria del servidor.
 */
const DESFASE_MS = -5 * 60 * 60 * 1000;
const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

/** Ventana en la que se envían correos: lunes a viernes de 8:00 a 18:00 (hora Colombia). */
export const VENTANA_ENVIO = { horaInicio: 8, horaFin: 18, diasHabiles: [1, 2, 3, 4, 5] };

/** Fecha "corrida" cuyos campos UTC (getUTCHours, etc.) son la hora local de Colombia. */
const aLocal = (d: Date) => new Date(d.getTime() + DESFASE_MS);
const deLocal = (d: Date) => new Date(d.getTime() - DESFASE_MS);

/** "2026-10-31": identifica el día en Colombia (para contar envíos por día). */
export const claveDia = (d: Date) => aLocal(d).toISOString().slice(0, 10);

/** Medianoche (hora Colombia) del día de `d`, como instante UTC. */
export function inicioDia(d: Date): Date {
  const local = aLocal(d);
  local.setUTCHours(0, 0, 0, 0);
  return deLocal(local);
}

const enVentana = (d: Date) => {
  const local = aLocal(d);
  const hora = local.getUTCHours();
  return VENTANA_ENVIO.diasHabiles.includes(local.getUTCDay()) && hora >= VENTANA_ENVIO.horaInicio && hora < VENTANA_ENVIO.horaFin;
};

/** Próxima apertura de la ventana estrictamente posterior al día de `d` si `diaSiguiente`, o desde `d` en adelante. */
function proximaApertura(d: Date, diaSiguiente: boolean): Date {
  const local = aLocal(d);
  if (diaSiguiente || local.getUTCHours() >= VENTANA_ENVIO.horaFin) local.setUTCDate(local.getUTCDate() + 1);
  local.setUTCHours(VENTANA_ENVIO.horaInicio, 0, 0, 0);
  while (!VENTANA_ENVIO.diasHabiles.includes(local.getUTCDay())) local.setUTCDate(local.getUTCDate() + 1);
  return deLocal(local);
}

/**
 * Si `d` cae fuera del horario laboral, la mueve a la siguiente apertura más unos minutos
 * aleatorios (0–15) para que los correos no salgan siempre a las 8:00:00 en punto.
 */
export function ajustarAVentana(d: Date, aleatorio: () => number): Date {
  if (enVentana(d)) return d;
  return new Date(proximaApertura(d, false).getTime() + aleatorio() * 15 * MINUTO);
}

/** Apertura de la ventana del siguiente día hábil (para cuando el día ya llegó a su límite). */
export const siguienteDiaHabil = (d: Date, aleatorio: () => number) =>
  new Date(proximaApertura(d, true).getTime() + aleatorio() * 15 * MINUTO);

export const sumarDias = (d: Date, dias: number) => new Date(d.getTime() + dias * DIA);
