/*
  Warnings:

  - Made the column `scheduledAt` on table `Block` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Block" ALTER COLUMN "scheduledAt" SET NOT NULL,
ALTER COLUMN "scheduledAt" SET DEFAULT CURRENT_TIMESTAMP;
