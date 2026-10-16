-- CreateTable
CREATE TABLE "notificaciones_enviadas" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "enviadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_enviadas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notificaciones_enviadas_clave_key" ON "notificaciones_enviadas"("clave");
