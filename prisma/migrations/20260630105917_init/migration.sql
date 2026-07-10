/*
  Warnings:

  - The primary key for the `attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_pkey",
ALTER COLUMN "attendance_id" SET DATA TYPE BIGINT,
ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id");
