/*
  Warnings:

  - Added the required column `cuposDisponibles` to the `clases` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clases" ADD COLUMN     "cuposDisponibles" INTEGER NOT NULL;
