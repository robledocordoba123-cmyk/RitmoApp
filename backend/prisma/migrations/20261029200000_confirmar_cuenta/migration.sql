-- RF-06 · HU-06: confirmar el correo al registrar una academia.
-- Los usuarios que ya existen quedan con confirmacionPendiente = false (el
-- valor por defecto), así que nadie pierde el acceso con esta migración.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "confirmacionPendiente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "correoConfirmadoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tokens_confirmacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_confirmacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_confirmacion_tokenHash_key" ON "tokens_confirmacion"("tokenHash");

-- CreateIndex
CREATE INDEX "tokens_confirmacion_userId_idx" ON "tokens_confirmacion"("userId");

-- AddForeignKey
ALTER TABLE "tokens_confirmacion" ADD CONSTRAINT "tokens_confirmacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
