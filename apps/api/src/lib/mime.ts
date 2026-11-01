import { randomBytes } from 'node:crypto';

export interface CorreoMime {
  de: { nombre: string; correo: string };
  para: string;
  asunto: string;
  cuerpo: string;
  adjunto?: { nombre: string; tipo: string; contenido: Buffer };
}

/** Quita saltos de línea para que ningún valor pueda inyectar cabeceras (por ejemplo un Bcc:). */
const sinSaltos = (v: string) => v.replace(/[\r\n]+/g, ' ');

/** Codifica una cabecera con tildes según RFC 2047 (=?UTF-8?B?...?=). */
const codificarCabecera = (v: string) => `=?UTF-8?B?${Buffer.from(sinSaltos(v), 'utf8').toString('base64')}?=`;

const base64EnLineas = (b: Buffer) => b.toString('base64').replace(/.{76}/g, '$&\r\n');

/** Arma un correo RFC 822 con cuerpo de texto y un adjunto opcional, listo para la Gmail API. */
export function construirMime(c: CorreoMime): string {
  const limite = `ep_${randomBytes(12).toString('hex')}`;
  const cabeceras = [
    `From: ${codificarCabecera(c.de.nombre)} <${sinSaltos(c.de.correo)}>`,
    `To: ${sinSaltos(c.para)}`,
    `Subject: ${codificarCabecera(c.asunto)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${limite}"`,
  ];

  const partes = [
    [
      `--${limite}`,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      base64EnLineas(Buffer.from(c.cuerpo.replace(/\r?\n/g, '\r\n'), 'utf8')),
    ].join('\r\n'),
  ];

  if (c.adjunto) {
    const nombre = sinSaltos(c.adjunto.nombre).replace(/"/g, '');
    partes.push(
      [
        `--${limite}`,
        `Content-Type: ${c.adjunto.tipo}; name="${nombre}"`,
        `Content-Disposition: attachment; filename="${nombre}"`,
        'Content-Transfer-Encoding: base64',
        '',
        base64EnLineas(c.adjunto.contenido),
      ].join('\r\n'),
    );
  }

  return `${cabeceras.join('\r\n')}\r\n\r\n${partes.join('\r\n')}\r\n--${limite}--\r\n`;
}
