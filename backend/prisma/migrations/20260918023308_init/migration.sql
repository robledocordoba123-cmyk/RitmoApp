-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPERADMIN', 'ADMIN_ACADEMIA', 'PROFESOR', 'ESTUDIANTE');

-- CreateEnum
CREATE TYPE "EstadoTenant" AS ENUM ('ACTIVA', 'SUSPENDIDA');

-- CreateEnum
CREATE TYPE "EstadoClase" AS ENUM ('PROGRAMADA', 'CANCELADA', 'FINALIZADA');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('CONFIRMADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoAsistencia" AS ENUM ('ASISTIO', 'INASISTENCIA', 'EXCUSA');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT NOT NULL,
    "estado" "EstadoTenant" NOT NULL DEFAULT 'ACTIVA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "salones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ritmos" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "ritmos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ritmoId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "profesorId" TEXT NOT NULL,
    "cupoMaximo" INTEGER NOT NULL,
    "fechaHoraInicio" TIMESTAMP(3) NOT NULL,
    "fechaHoraFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoClase" NOT NULL DEFAULT 'PROGRAMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'CONFIRMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claseId" TEXT NOT NULL,
    "estudianteId" TEXT NOT NULL,
    "estado" "EstadoAsistencia" NOT NULL,
    "registradoPorId" TEXT NOT NULL,
    "registradoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_nit_key" ON "tenants"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_tenantId_idx" ON "users"("tenantId");

-- CreateIndex
CREATE INDEX "salones_tenantId_idx" ON "salones"("tenantId");

-- CreateIndex
CREATE INDEX "ritmos_tenantId_idx" ON "ritmos"("tenantId");

-- CreateIndex
CREATE INDEX "clases_tenantId_idx" ON "clases"("tenantId");

-- CreateIndex
CREATE INDEX "clases_salonId_fechaHoraInicio_fechaHoraFin_idx" ON "clases"("salonId", "fechaHoraInicio", "fechaHoraFin");

-- CreateIndex
CREATE INDEX "clases_profesorId_fechaHoraInicio_fechaHoraFin_idx" ON "clases"("profesorId", "fechaHoraInicio", "fechaHoraFin");

-- CreateIndex
CREATE INDEX "reservas_tenantId_idx" ON "reservas"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "reservas_claseId_estudianteId_key" ON "reservas"("claseId", "estudianteId");

-- CreateIndex
CREATE INDEX "asistencias_tenantId_idx" ON "asistencias"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_claseId_estudianteId_key" ON "asistencias"("claseId", "estudianteId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salones" ADD CONSTRAINT "salones_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ritmos" ADD CONSTRAINT "ritmos_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "clases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "clases_ritmoId_fkey" FOREIGN KEY ("ritmoId") REFERENCES "ritmos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "clases_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clases" ADD CONSTRAINT "clases_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "clases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
