-- AlterTable
ALTER TABLE "Empresa" ADD COLUMN "ultimoContactoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Empresa_usuarioId_ultimoContactoEn_idx" ON "Empresa"("usuarioId", "ultimoContactoEn");

-- Rellena la fecha con el último correo enviado de cada empresa
UPDATE "Empresa" e
SET "ultimoContactoEn" = (
  SELECT MAX(v."fechaEnvio") FROM "Envio" v WHERE v."empresaId" = e."id" AND v."estado" = 'ENVIADO'
);
