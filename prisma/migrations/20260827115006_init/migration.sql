/*
  Warnings:

  - The primary key for the `attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `clock_in_timestamp` column on the `attendance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `clock_out_timestamp` column on the `attendance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `last_login` column on the `employees` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `calendar_date` on the `attendance` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `joined_at` on the `employees` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `milestone_deadline` on the `teams` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `created_at` on the `teams` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `updated_at` on the `teams` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('Text', 'Image', 'File');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('Privilege', 'Casual', 'Sick', 'Paternity', 'Maternity', 'Unpaid', 'CompOff');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled', 'Withdrawn');

-- DropIndex
DROP INDEX "employees_full_name_trgm_idx";

-- AlterTable
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_pkey",
ALTER COLUMN "attendance_id" SET DATA TYPE BIGINT USING "attendance_id"::bigint,
DROP COLUMN "calendar_date",
ADD COLUMN     "calendar_date" BIGINT NOT NULL,
DROP COLUMN "clock_in_timestamp",
ADD COLUMN     "clock_in_timestamp" BIGINT,
DROP COLUMN "clock_out_timestamp",
ADD COLUMN     "clock_out_timestamp" BIGINT,
ALTER COLUMN "total_hours_computed" SET DATA TYPE DECIMAL(10,2),
ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id");

-- AlterTable
CREATE SEQUENCE employees_employee_id_seq;
ALTER TABLE "employees" ALTER COLUMN "employee_id" SET DEFAULT nextval('employees_employee_id_seq'),
DROP COLUMN "joined_at",
ADD COLUMN     "joined_at" BIGINT NOT NULL,
DROP COLUMN "last_login",
ADD COLUMN     "last_login" BIGINT;
ALTER SEQUENCE employees_employee_id_seq OWNED BY "employees"."employee_id";

-- AlterTable
ALTER TABLE "teams" DROP COLUMN "milestone_deadline",
ADD COLUMN     "milestone_deadline" BIGINT NOT NULL,
DROP COLUMN "created_at",
ADD COLUMN     "created_at" BIGINT NOT NULL,
DROP COLUMN "updated_at",
ADD COLUMN     "updated_at" BIGINT NOT NULL;

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "conversations" (
    "conversation_id" TEXT NOT NULL,
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "group_name" TEXT,
    "created_by_id" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "last_message_at" BIGINT,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "conversation_participant_id" BIGSERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "joined_at" BIGINT NOT NULL,
    "last_read_at" BIGINT,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("conversation_participant_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" BIGSERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" BIGINT NOT NULL,
    "content" TEXT NOT NULL,
    "message_type" "MessageType" NOT NULL DEFAULT 'Text',
    "file_url" TEXT,
    "file_name" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "leave_policy_id" BIGSERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "privilege_leave_days" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "flexi_leave_days" DECIMAL(5,2) NOT NULL DEFAULT 6,
    "maternity_leave_days" DECIMAL(5,2) NOT NULL DEFAULT 182,
    "comp_off_leave_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "carry_forward_allowed" BOOLEAN NOT NULL DEFAULT true,
    "max_carry_forward_days" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "encashment_allowed" BOOLEAN NOT NULL DEFAULT false,
    "max_encashment_days" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "min_notice_privilege" INTEGER NOT NULL DEFAULT 7,
    "min_notice_flexi" INTEGER NOT NULL DEFAULT 1,
    "max_consecutive_privilege" INTEGER NOT NULL DEFAULT 15,
    "max_consecutive_flexi" INTEGER NOT NULL DEFAULT 5,
    "half_day_leave_allowed" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,
    "created_by_hr" TEXT,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("leave_policy_id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "leave_balance_id" BIGSERIAL NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "year" INTEGER NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "total_allocated" DECIMAL(5,2) NOT NULL,
    "total_used" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_pending" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_available" DECIMAL(5,2) NOT NULL,
    "carried_forward" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_updated" BIGINT NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("leave_balance_id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "leave_request_id" BIGSERIAL NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "leave_type" "LeaveType" NOT NULL,
    "from_date" BIGINT NOT NULL,
    "to_date" BIGINT NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "half_day_period" TEXT,
    "total_days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "contact_number" TEXT,
    "emergency_contact" TEXT,
    "attachment_url" TEXT,
    "attachment_file_name" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'Pending',
    "submitted_at" BIGINT NOT NULL,
    "reviewed_at" BIGINT,
    "reviewed_by_id" BIGINT,
    "review_comments" TEXT,
    "cancelled_at" BIGINT,
    "cancellation_reason" TEXT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("leave_request_id")
);

-- CreateIndex
CREATE INDEX "idx_conversation_last_message" ON "conversations"("last_message_at");

-- CreateIndex
CREATE INDEX "idx_participant_employee" ON "conversation_participants"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversation_id_employee_id_key" ON "conversation_participants"("conversation_id", "employee_id");

-- CreateIndex
CREATE INDEX "idx_message_conversation_created" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_leave_policy_year_active" ON "leave_policies"("year", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_year_key" ON "leave_policies"("year");

-- CreateIndex
CREATE INDEX "idx_leave_balance_employee_year" ON "leave_balances"("employee_id", "year");

-- CreateIndex
CREATE INDEX "idx_leave_balance_year" ON "leave_balances"("year");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_year_leave_type_key" ON "leave_balances"("employee_id", "year", "leave_type");

-- CreateIndex
CREATE INDEX "idx_leave_request_employee_status" ON "leave_requests"("employee_id", "status");

-- CreateIndex
CREATE INDEX "idx_leave_request_status_submitted" ON "leave_requests"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "idx_leave_request_dates" ON "leave_requests"("from_date", "to_date");

-- CreateIndex
CREATE INDEX "idx_leave_request_reviewed_by" ON "leave_requests"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "idx_attendance_composite" ON "attendance"("employee_id", "calendar_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_calendar_date_key" ON "attendance"("employee_id", "calendar_date");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "unique_payroll_month_year" RENAME TO "payroll_runs_payroll_month_payroll_year_key";

-- RenameIndex
ALTER INDEX "unique_employee_payroll_run" RENAME TO "payslips_payroll_run_id_employee_id_key";
