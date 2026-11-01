import type { EstadoContacto } from '@ep/shared';
import { sumarDias } from '../../lib/horario';

/**
 * Fecha en que toca hacer seguimiento a una empresa, o null si no aplica.
 * Solo aplica a empresas en estado ENVIADO (contactadas y sin respuesta registrada):
 * es el último contacto + los días configurados, o la fecha a la que se pospuso si es posterior.
 */
export function calcularProximoSeguimiento(
  e: { estado: EstadoContacto; ultimoContactoEn: Date | null; recordatorioHasta: Date | null },
  diasSeguimiento: number,
): Date | null {
  if (e.estado !== 'ENVIADO' || !e.ultimoContactoEn) return null;
  const segunDias = sumarDias(e.ultimoContactoEn, diasSeguimiento);
  return e.recordatorioHasta && e.recordatorioHasta > segunDias ? e.recordatorioHasta : segunDias;
}

/**
 * Condición de base de datos equivalente a "proximoSeguimiento <= ahora":
 * enviada, contactada hace al menos `diasSeguimiento` y sin un aplazamiento vigente.
 */
export function filtroSeguimientoPendiente(diasSeguimiento: number, ahora: Date) {
  return {
    estado: 'ENVIADO' as const,
    ultimoContactoEn: { lte: sumarDias(ahora, -diasSeguimiento) },
    OR: [{ recordatorioHasta: null }, { recordatorioHasta: { lte: ahora } }],
  };
}
