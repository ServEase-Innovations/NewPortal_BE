/*
  Warnings:

  - The primary key for the `attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `attendance_id` on the `attendance` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- AlterTable
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_pkey",
ALTER COLUMN "attendance_id" SET DATA TYPE SERIAL,
ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id");
