import { ajustarAVentana, claveDia, siguienteDiaHabil } from '../../lib/horario';

export interface OpcionesPlanificacion {
  ahora: Date;
  /** Último envío hecho o programado del usuario: el siguiente debe esperar después de él. */
  ultimo: Date | null;
  /** Correos ya enviados o programados por día (clave = claveDia). Se modifica al planificar. */
  ocupacion: Map<string, number>;
  limiteDiario: number;
  espaciadoMinSeg: number;
  espaciadoMaxSeg: number;
  aleatorio?: () => number;
}

/**
 * Asigna una fecha a cada uno de los `cantidad` correos respetando:
 * - el horario laboral (lunes a viernes, 8:00–18:00 hora Colombia),
 * - el límite de correos por día,
 * - una espera aleatoria entre `espaciadoMinSeg` y `espaciadoMaxSeg` entre correos.
 */
export function planificarHorarios(cantidad: number, o: OpcionesPlanificacion): Date[] {
  const aleatorio = o.aleatorio ?? Math.random;
  const espera = () => (o.espaciadoMinSeg + aleatorio() * (o.espaciadoMaxSeg - o.espaciadoMinSeg)) * 1000;

  let cursor = new Date(Math.max(o.ahora.getTime(), o.ultimo ? o.ultimo.getTime() + espera() : 0));
  const horarios: Date[] = [];

  for (let i = 0; i < cantidad; i++) {
    cursor = ajustarAVentana(cursor, aleatorio);
    while ((o.ocupacion.get(claveDia(cursor)) ?? 0) >= o.limiteDiario) {
      cursor = siguienteDiaHabil(cursor, aleatorio);
    }
    horarios.push(cursor);
    o.ocupacion.set(claveDia(cursor), (o.ocupacion.get(claveDia(cursor)) ?? 0) + 1);
    cursor = new Date(cursor.getTime() + espera());
  }
  return horarios;
}
