import { env } from './config/env';
import { crearApp } from './app';
import { iniciarColaEnvios } from './jobs/colaEnvios.worker';
import { prisma } from './lib/prisma';

const servidor = crearApp().listen(env.API_PORT, () => {
  console.log(`API escuchando en http://localhost:${env.API_PORT}`);
});

const detenerCola = env.COLA_ACTIVA ? iniciarColaEnvios() : () => {};

async function apagar() {
  detenerCola();
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
