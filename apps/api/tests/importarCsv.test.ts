import { describe, expect, it } from 'vitest';
import { analizarCsv } from '../src/modules/empresas/importarCsv.service';

const vacio = () => ({ correos: new Set<string>(), nits: new Set<string>() });
const csv = (texto: string) => Buffer.from(texto, 'utf8');

describe('analizarCsv', () => {
  it('reconoce encabezados con tildes, mayúsculas y separador ";" de Excel', () => {
    const r = analizarCsv(
      csv('Razón Social;NIT;Ciudad;Correo Electrónico;Página Web;Otra\nAcme SAS;900.123.456-7;Bogotá, D.C.;RRHH@Acme.co;acme.co;x\n'),
      vacio(),
    );
    expect(r.columnas).toEqual({
      'Razón Social': 'nombre',
      NIT: 'nit',
      Ciudad: 'ciudad',
      'Correo Electrónico': 'correoContacto',
      'Página Web': 'sitioWeb',
    });
    expect(r.columnasIgnoradas).toEqual(['Otra']);
    expect(r.filas[0]).toMatchObject({
      fila: 2,
      resultado: 'valida',
      empresa: {
        nombre: 'Acme SAS',
        nit: '900123456-7',
        ciudad: 'Bogotá, D.C.',
        correoContacto: 'rrhh@acme.co',
        sitioWeb: 'https://acme.co',
        sector: null,
      },
    });
  });

  it('marca correos inválidos y nombres vacíos', () => {
    const r = analizarCsv(csv('nombre,correo\nAcme,no-es-correo\n,talento@b.co\n'), vacio());
    expect(r.filas.map((f) => f.resultado)).toEqual(['invalida', 'invalida']);
    expect(r.filas[0]!.errores).toContain('Correo no válido');
    expect(r.resumen).toMatchObject({ total: 2, validas: 0, invalidas: 2 });
  });

  it('detecta duplicados dentro del archivo y contra la base de datos', () => {
    const existentes = { correos: new Set(['ya@existe.co']), nits: new Set(['800111222']) };
    const r = analizarCsv(
      csv('nombre,correo,nit\nAlfa,uno@a.co,800111222\nBeta,UNO@a.co,\nGama,ya@existe.co,\n'),
      existentes,
    );
    expect(r.filas.map((f) => f.resultado)).toEqual(['valida', 'duplicada', 'duplicada']);
    expect(r.filas[0]!.avisos).toContain('Ya tienes otra empresa con este NIT');
    expect(r.filas[1]!.errores).toEqual(['Correo repetido (fila 2)']);
    expect(r.filas[2]!.errores).toEqual(['Ya tienes una empresa con este correo']);
  });

  it('usa el primer correo si la celda trae varios y avisa de correos personales', () => {
    const r = analizarCsv(csv('nombre,correo\nTienda,"tienda@gmail.com, otro@gmail.com"\n'), vacio());
    expect(r.filas[0]!.empresa?.correoContacto).toBe('tienda@gmail.com');
    expect(r.filas[0]!.avisos).toHaveLength(2);
  });

  it('lee archivos guardados en Windows-1252', () => {
    const latin1 = Buffer.from('nombre;correo;ciudad\nCafé Ñandú;a@b.co;Medellín\n', 'latin1');
    expect(analizarCsv(latin1, vacio()).filas[0]!.empresa).toMatchObject({ nombre: 'Café Ñandú', ciudad: 'Medellín' });
  });

  it('exige las columnas nombre y correo', () => {
    expect(() => analizarCsv(csv('empresa,telefono\nA,123\n'), vacio())).toThrow(/nombre.*correo/);
  });
});
