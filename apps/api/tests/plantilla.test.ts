import { describe, expect, it } from 'vitest';
import {
  LINEA_EXCLUSION,
  PLANTILLA_SUGERIDA,
  plantillaSchema,
  renderizarPlantilla,
  variablesDesconocidas,
} from '@ep/shared';

const valores = { empresa: 'Acme SAS', nombre: 'Ana Pérez', programa: 'ADSO', ficha: '2758341', telefono: '300 123 4567' };

describe('renderizarPlantilla', () => {
  it('reemplaza variables en asunto y cuerpo, con espacios y mayúsculas', () => {
    const r = renderizarPlantilla(
      { asunto: 'Hola {empresa}', cuerpo: 'Soy { nombre }, ficha {FICHA}.', incluirLineaExclusion: false },
      valores,
    );
    expect(r).toEqual({ asunto: 'Hola Acme SAS', cuerpo: 'Soy Ana Pérez, ficha 2758341.', faltantes: [] });
  });

  it('deja visibles las variables sin valor y las reporta', () => {
    const r = renderizarPlantilla(
      { asunto: 'Ficha {ficha}', cuerpo: 'Tel: {telefono} {telefono}', incluirLineaExclusion: false },
      { ...valores, ficha: null, telefono: '  ' },
    );
    expect(r.asunto).toBe('Ficha {ficha}');
    expect(r.faltantes.sort()).toEqual(['ficha', 'telefono']);
  });

  it('agrega la línea para no ser contactado cuando está activada', () => {
    const r = renderizarPlantilla({ asunto: 'a', cuerpo: 'Cuerpo', incluirLineaExclusion: true }, valores);
    expect(r.cuerpo).toBe(`Cuerpo\n\n--\n${LINEA_EXCLUSION}`);
  });

  it('no inventa valores para variables desconocidas', () => {
    expect(renderizarPlantilla({ asunto: '{cargo}', cuerpo: 'x', incluirLineaExclusion: false }, valores).asunto).toBe('{cargo}');
  });

  it('la plantilla sugerida no deja variables sin reemplazar con un perfil completo', () => {
    const r = renderizarPlantilla(PLANTILLA_SUGERIDA, valores);
    expect(r.faltantes).toEqual([]);
    expect(r.cuerpo).not.toMatch(/\{\w+\}/);
  });
});

describe('plantillaSchema', () => {
  it('rechaza variables que no existen', () => {
    const r = plantillaSchema.safeParse({ ...PLANTILLA_SUGERIDA, cuerpo: 'Hola {nombre_empresa}, soy {nombre} de la ficha' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/\{nombre_empresa\}/);
    expect(variablesDesconocidas('{empresa} {Cargo} {cargo}')).toEqual(['cargo']);
  });

  it('rechaza saltos de línea en el asunto', () => {
    expect(plantillaSchema.safeParse({ ...PLANTILLA_SUGERIDA, asunto: 'Hola\nBcc: x@y.co' }).success).toBe(false);
  });
});
