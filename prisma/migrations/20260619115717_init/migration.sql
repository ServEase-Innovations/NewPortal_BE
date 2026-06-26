/*
  Warnings:

  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Working', 'OnLeave', 'Absent');

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "teams" (
    "team_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "project_title" TEXT NOT NULL,
    "project_summary" TEXT,
    "milestone_deadline" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "attendance_id" BIGSERIAL NOT NULL,
    "employee_id" TEXT NOT NULL,
    "calendar_date" DATE NOT NULL,
    "shift_status" "AttendanceStatus" NOT NULL DEFAULT 'Working',
    "clock_in_timestamp" TIME(6),
    "clock_out_timestamp" TIME(6),
    "total_hours_computed" DECIMAL(4,2) NOT NULL DEFAULT 8.00,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id")
);

-- CreateTable
CREATE TABLE "daily_activities" (
    "activity_id" BIGSERIAL NOT NULL,
    "employee_id" TEXT NOT NULL,
    "logged_date" DATE NOT NULL,
    "text_description" TEXT NOT NULL,
    "jira_ticket_url" TEXT,
    "persisted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_activities_pkey" PRIMARY KEY ("activity_id")
);

-- CreateTable
CREATE TABLE "financial_payslips" (
    "payslip_id" BIGSERIAL NOT NULL,
    "employee_id" TEXT NOT NULL,
    "target_month" INTEGER NOT NULL,
    "target_year" INTEGER NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "allowance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deduction_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_payable_amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "financial_payslips_pkey" PRIMARY KEY ("payslip_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_team_name_key" ON "teams"("team_name");

-- CreateIndex
CREATE INDEX "idx_attendance_composite" ON "attendance"("employee_id", "calendar_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_calendar_date_key" ON "attendance"("employee_id", "calendar_date");

-- CreateIndex
CREATE INDEX "idx_activities_composite" ON "daily_activities"("employee_id", "logged_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_activities_employee_id_logged_date_key" ON "daily_activities"("employee_id", "logged_date");

-- CreateIndex
CREATE UNIQUE INDEX "financial_payslips_employee_id_target_month_target_year_key" ON "financial_payslips"("employee_id", "target_month", "target_year");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("team_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_activities" ADD CONSTRAINT "daily_activities_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_payslips" ADD CONSTRAINT "financial_payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
