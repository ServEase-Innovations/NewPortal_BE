/*
  Warnings:

  - You are about to drop the `attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `daily_activities` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `financial_payslips` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "daily_activities" DROP CONSTRAINT "daily_activities_employee_id_fkey";

-- DropForeignKey
ALTER TABLE "employees" DROP CONSTRAINT "employees_team_id_fkey";

-- DropForeignKey
ALTER TABLE "financial_payslips" DROP CONSTRAINT "financial_payslips_employee_id_fkey";

-- DropTable
DROP TABLE "attendance";

-- DropTable
DROP TABLE "daily_activities";

-- DropTable
DROP TABLE "financial_payslips";

-- DropTable
DROP TABLE "teams";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
