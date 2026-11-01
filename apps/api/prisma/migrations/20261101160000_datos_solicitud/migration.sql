-- AlterTable: datos de la solicitud de aprendices (contacto, ubicación, cupos y cierre)
ALTER TABLE "Empresa" ADD COLUMN "departamento" TEXT,
ADD COLUMN "direccion" TEXT,
ADD COLUMN "telefono" TEXT,
ADD COLUMN "contactoNombre" TEXT,
ADD COLUMN "programaSolicitado" TEXT,
ADD COLUMN "cupos" INTEGER,
ADD COLUMN "fechaCierre" DATE;
