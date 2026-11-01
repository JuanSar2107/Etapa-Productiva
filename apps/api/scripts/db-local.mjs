// PostgreSQL local sin Docker ni instalación: descarga los binarios desde npm (paquete embedded-postgres)
// y guarda los datos en apps/api/.pgdata. Déjalo corriendo en una terminal mientras usas la app.
// URL para el .env: postgresql://etapa:etapa@localhost:5433/etapa_productiva?schema=public
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const PUERTO = 5433; // distinto de 5432 para no chocar con un PostgreSQL instalado
const directorio = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.pgdata');
const primeraVez = !existsSync(directorio);

const pg = new EmbeddedPostgres({
  databaseDir: directorio,
  user: 'etapa',
  password: 'etapa',
  port: PUERTO,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'], // sin esto Windows usa WIN1252 y fallan las tildes
});

if (primeraVez) await pg.initialise();
await pg.start();
if (primeraVez) await pg.createDatabase('etapa_productiva');

console.log(`PostgreSQL listo en el puerto ${PUERTO} (datos en ${directorio}). Ctrl+C para detenerlo.`);

const detener = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', detener);
process.on('SIGTERM', detener);
setInterval(() => {}, 1 << 30);
