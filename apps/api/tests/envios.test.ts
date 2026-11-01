import { describe, expect, it } from 'vitest';
import { clasificarErrorGmail, ErrorGmail } from '../src/errors/gmailErrors';
import { claveDia } from '../src/lib/horario';
import { construirMime } from '../src/lib/mime';
import { planificarHorarios } from '../src/modules/envios/planificador';

/** Hora de Colombia → instante UTC. Ej.: bogota('2026-11-03T09:00') */
const bogota = (local: string) => new Date(`${local}:00-05:00`);
/** Hora local de Colombia como "HH:MM" */
const horaLocal = (d: Date) => new Date(d.getTime() - 5 * 3600e3).toISOString().slice(11, 16);

const base = {
  ultimo: null,
  limiteDiario: 15,
  espaciadoMinSeg: 120,
  espaciadoMaxSeg: 600,
  aleatorio: () => 0.5, // espera fija de 6 minutos y 7,5 min de margen al abrir la ventana
};

describe('planificarHorarios', () => {
  it('envía de inmediato si está en horario y espacia los siguientes', () => {
    const ahora = bogota('2026-11-03T09:00'); // martes
    const h = planificarHorarios(3, { ...base, ahora, ocupacion: new Map() });
    expect(h.map(horaLocal)).toEqual(['09:00', '09:06', '09:12']);
  });

  it('respeta el límite diario y pasa al siguiente día hábil', () => {
    const ahora = bogota('2026-11-06T17:00'); // viernes
    const ocupacion = new Map([[claveDia(ahora), 14]]);
    const h = planificarHorarios(2, { ...base, ahora, ocupacion });
    expect(claveDia(h[0]!)).toBe('2026-11-06');
    expect(claveDia(h[1]!)).toBe('2026-11-09'); // salta el fin de semana hasta el lunes
    expect(horaLocal(h[1]!)).toBe('08:07');
    expect(ocupacion.get('2026-11-06')).toBe(15);
  });

  it('mueve al horario laboral los correos pedidos de noche o en fin de semana', () => {
    expect(horaLocal(planificarHorarios(1, { ...base, ahora: bogota('2026-11-03T05:30'), ocupacion: new Map() })[0]!)).toBe('08:07');
    const domingo = planificarHorarios(1, { ...base, ahora: bogota('2026-11-08T12:00'), ocupacion: new Map() })[0]!;
    expect(claveDia(domingo)).toBe('2026-11-09');
  });

  it('no se cruza con los correos que ya estaban en cola', () => {
    const ahora = bogota('2026-11-03T09:00');
    const ultimo = bogota('2026-11-03T10:00');
    const [h] = planificarHorarios(1, { ...base, ahora, ultimo, ocupacion: new Map() });
    expect(horaLocal(h!)).toBe('10:06');
  });

  it('nunca pone más correos que el límite en un mismo día', () => {
    const ocupacion = new Map<string, number>();
    const h = planificarHorarios(40, { ...base, aleatorio: Math.random, limiteDiario: 15, ahora: bogota('2026-11-03T08:00'), ocupacion });
    const porDia = new Map<string, number>();
    h.forEach((d) => porDia.set(claveDia(d), (porDia.get(claveDia(d)) ?? 0) + 1));
    expect(Math.max(...porDia.values())).toBeLessThanOrEqual(15);
    for (let i = 1; i < h.length; i++) expect(h[i]!.getTime()).toBeGreaterThan(h[i - 1]!.getTime());
  });
});

describe('construirMime', () => {
  const mime = construirMime({
    de: { nombre: 'Ana Pérez', correo: 'ana@gmail.com' },
    para: 'rrhh@acme.co',
    asunto: 'Solicitud de práctica\r\nBcc: espia@x.co',
    cuerpo: 'Hola,\nadjunto mi hoja de vida.',
    adjunto: { nombre: 'hoja_de_vida.pdf', tipo: 'application/pdf', contenido: Buffer.from('%PDF-1.7 prueba') },
  });

  it('codifica las cabeceras con tildes y no permite inyectar cabeceras', () => {
    const [cabeceras] = mime.split('\r\n\r\n');
    expect(cabeceras).toContain(`From: =?UTF-8?B?${Buffer.from('Ana Pérez').toString('base64')}?= <ana@gmail.com>`);
    expect(cabeceras).toContain('To: rrhh@acme.co');
    expect(cabeceras).not.toMatch(/^Bcc:/m);
    const asunto = /^Subject: =\?UTF-8\?B\?(.+)\?=$/m.exec(cabeceras!)![1]!;
    expect(Buffer.from(asunto, 'base64').toString()).toBe('Solicitud de práctica Bcc: espia@x.co');
  });

  it('incluye el cuerpo y el PDF adjunto en base64', () => {
    expect(mime).toContain(Buffer.from('Hola,\r\nadjunto mi hoja de vida.').toString('base64'));
    expect(mime).toContain('Content-Disposition: attachment; filename="hoja_de_vida.pdf"');
    expect(mime).toContain(Buffer.from('%PDF-1.7 prueba').toString('base64'));
    expect(mime.trimEnd()).toMatch(/--ep_[0-9a-f]+--$/);
  });
});

describe('clasificarErrorGmail', () => {
  it.each([
    [{ response: { data: { error: 'invalid_grant' } } }, 'reconectar'],
    [new ErrorGmail(401, [], 'Invalid Credentials'), 'reconectar'],
    [new ErrorGmail(403, ['insufficientPermissions'], 'Insufficient Permission'), 'reconectar'],
    [new ErrorGmail(429, ['rateLimitExceeded'], 'Too many requests'), 'temporal'],
    [new ErrorGmail(403, ['dailyLimitExceeded'], 'Daily Limit Exceeded'), 'cuotaDiaria'],
    [new ErrorGmail(503, [], 'Backend Error'), 'temporal'],
    [new ErrorGmail(400, ['invalidArgument'], 'Invalid To header'), 'permanente'],
    [new TypeError('fetch failed'), 'temporal'],
  ])('%s → %s', (err, tipo) => {
    expect(clasificarErrorGmail(err).tipo).toBe(tipo);
  });
});
