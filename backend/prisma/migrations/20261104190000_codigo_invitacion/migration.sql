-- HU-22: código de invitación de cada academia para el registro de estudiantes.
ALTER TABLE "tenants" ADD COLUMN "codigoInvitacion" TEXT;
ALTER TABLE "tenants" ADD COLUMN "codigoInvitacionVenceEn" TIMESTAMP(3);

CREATE UNIQUE INDEX "tenants_codigoInvitacion_key" ON "tenants"("codigoInvitacion");
