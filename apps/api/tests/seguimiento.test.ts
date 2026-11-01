import { describe, expect, it } from 'vitest';
import { calcularProximoSeguimiento, filtroSeguimientoPendiente } from '../src/modules/empresas/seguimiento';

const dia = (n: number) => new Date(Date.UTC(2026, 10, n, 15)); // n de noviembre de 2026

describe('calcularProximoSeguimiento', () => {
  it('es el último contacto más los días configurados', () => {
    expect(calcularProximoSeguimiento({ estado: 'ENVIADO', ultimoContactoEn: dia(2), recordatorioHasta: null }, 7)).toEqual(dia(9));
  });

  it('respeta un aplazamiento posterior y descarta uno anterior', () => {
    const base = { estado: 'ENVIADO' as const, ultimoContactoEn: dia(2) };
    expect(calcularProximoSeguimiento({ ...base, recordatorioHasta: dia(15) }, 7)).toEqual(dia(15));
    expect(calcularProximoSeguimiento({ ...base, recordatorioHasta: dia(5) }, 7)).toEqual(dia(9));
  });

  it('no aplica si la empresa ya respondió, rechazó, está en cola o nunca se contactó', () => {
    for (const estado of ['RESPONDIO', 'RECHAZADO', 'NO_CONTACTAR', 'PENDIENTE', 'SIN_CONTACTAR'] as const) {
      expect(calcularProximoSeguimiento({ estado, ultimoContactoEn: dia(2), recordatorioHasta: null }, 7)).toBeNull();
    }
    expect(calcularProximoSeguimiento({ estado: 'ENVIADO', ultimoContactoEn: null, recordatorioHasta: null }, 7)).toBeNull();
  });
});

describe('filtroSeguimientoPendiente', () => {
  it('pide contactos de hace al menos N días y sin aplazamiento vigente', () => {
    const f = filtroSeguimientoPendiente(7, dia(20));
    expect(f.estado).toBe('ENVIADO');
    expect(f.ultimoContactoEn.lte).toEqual(dia(13));
    expect(f.OR).toEqual([{ recordatorioHasta: null }, { recordatorioHasta: { lte: dia(20) } }]);
  });
});
