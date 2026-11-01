-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "FuenteEmpresa" AS ENUM ('MANUAL', 'CSV', 'EXTENSION');

-- CreateEnum
CREATE TYPE "EstadoContacto" AS ENUM ('SIN_CONTACTAR', 'PENDIENTE', 'ENVIADO', 'RESPONDIO', 'RECHAZADO', 'NO_CONTACTAR');

-- CreateEnum
CREATE TYPE "EstadoEnvio" AS ENUM ('PROGRAMADO', 'ENVIANDO', 'ENVIADO', 'ERROR', 'CANCELADO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "googleId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "programaFormacion" TEXT,
    "ficha" TEXT,
    "telefono" TEXT,
    "hojaVidaRuta" TEXT,
    "hojaVidaNombre" TEXT,
    "hojaVidaBytes" INTEGER,
    "accessTokenCifrado" TEXT,
    "refreshTokenCifrado" TEXT,
    "tokenExpiraEn" TIMESTAMP(3),
    "scopes" TEXT,
    "requiereReconexion" BOOLEAN NOT NULL DEFAULT false,
    "limiteDiario" INTEGER NOT NULL DEFAULT 15,
    "espaciadoMinSeg" INTEGER NOT NULL DEFAULT 120,
    "espaciadoMaxSeg" INTEGER NOT NULL DEFAULT 600,
    "diasSeguimiento" INTEGER NOT NULL DEFAULT 7,
    "autorizacionDatosEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "sector" TEXT,
    "ciudad" TEXT,
    "correoContacto" TEXT NOT NULL,
    "sitioWeb" TEXT,
    "fuente" "FuenteEmpresa" NOT NULL DEFAULT 'MANUAL',
    "notas" TEXT,
    "estado" "EstadoContacto" NOT NULL DEFAULT 'SIN_CONTACTAR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plantilla" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "incluirLineaExclusion" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envio" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "plantillaId" TEXT,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "estado" "EstadoEnvio" NOT NULL DEFAULT 'PROGRAMADO',
    "fechaProgramada" TIMESTAMP(3) NOT NULL,
    "fechaEnvio" TIMESTAMP(3),
    "gmailMessageId" TEXT,
    "gmailThreadId" TEXT,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ultimoError" TEXT,
    "fechaProximoSeguimiento" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_googleId_key" ON "Usuario"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "Empresa_usuarioId_estado_idx" ON "Empresa"("usuarioId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_usuarioId_correoContacto_key" ON "Empresa"("usuarioId", "correoContacto");

-- CreateIndex
CREATE UNIQUE INDEX "Plantilla_usuarioId_nombre_key" ON "Plantilla"("usuarioId", "nombre");

-- CreateIndex
CREATE INDEX "Envio_estado_fechaProgramada_idx" ON "Envio"("estado", "fechaProgramada");

-- CreateIndex
CREATE INDEX "Envio_usuarioId_fechaEnvio_idx" ON "Envio"("usuarioId", "fechaEnvio");

-- CreateIndex
CREATE INDEX "Envio_empresaId_idx" ON "Envio"("empresaId");

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plantilla" ADD CONSTRAINT "Plantilla_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envio" ADD CONSTRAINT "Envio_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

