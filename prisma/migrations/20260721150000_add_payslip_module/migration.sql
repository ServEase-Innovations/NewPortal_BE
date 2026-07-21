-- Additive, idempotent payroll and payslip migration.
-- Existing Employee, Team, Attendance, and Daily Task objects are not changed.

DO $$
BEGIN
  CREATE TYPE "PayrollRunStatus" AS ENUM ('Draft', 'Processing', 'Approved', 'Paid', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PayslipStatus" AS ENUM ('Draft', 'Approved', 'Paid', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "payroll_runs" (
  "payroll_run_id" BIGSERIAL NOT NULL,
  "payroll_month" INTEGER NOT NULL,
  "payroll_year" INTEGER NOT NULL,
  "period_start" BIGINT NOT NULL,
  "period_end" BIGINT NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "status" "PayrollRunStatus" NOT NULL DEFAULT 'Draft',
  "created_by_id" BIGINT NOT NULL,
  "approved_by_id" BIGINT,
  "approved_at" BIGINT,
  "paid_at" BIGINT,
  "created_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL,
  CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("payroll_run_id")
);

CREATE TABLE IF NOT EXISTS "payslips" (
  "payslip_id" BIGSERIAL NOT NULL,
  "payroll_run_id" BIGINT NOT NULL,
  "employee_id" BIGINT NOT NULL,
  "payslip_number" TEXT NOT NULL,
  "employee_name_snapshot" TEXT NOT NULL,
  "employee_email_snapshot" TEXT NOT NULL,
  "employee_role_snapshot" TEXT NOT NULL,
  "employee_department_snapshot" TEXT NOT NULL,
  "bank_account_masked" TEXT,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "working_days" DECIMAL(6,2) NOT NULL,
  "payable_days" DECIMAL(6,2) NOT NULL,
  "unpaid_leave_days" DECIMAL(6,2) NOT NULL DEFAULT 0,
  "base_salary_snapshot" DECIMAL(12,2) NOT NULL,
  "allowance_snapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deduction_snapshot" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "total_earnings" DECIMAL(12,2) NOT NULL,
  "total_deductions" DECIMAL(12,2) NOT NULL,
  "net_salary" DECIMAL(12,2) NOT NULL,
  "status" "PayslipStatus" NOT NULL DEFAULT 'Draft',
  "generated_at" BIGINT NOT NULL,
  "updated_at" BIGINT NOT NULL,
  "approved_at" BIGINT,
  "approved_by_id" BIGINT,
  "paid_at" BIGINT,
  "paid_by_id" BIGINT,
  "payment_reference" TEXT,
  "pdf_url" TEXT,
  CONSTRAINT "payslips_pkey" PRIMARY KEY ("payslip_id")
);

CREATE TABLE IF NOT EXISTS "payslip_earnings" (
  "payslip_earning_id" BIGSERIAL NOT NULL,
  "payslip_id" BIGINT NOT NULL,
  "earning_type" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "is_taxable" BOOLEAN NOT NULL DEFAULT true,
  "created_at" BIGINT NOT NULL,
  CONSTRAINT "payslip_earnings_pkey" PRIMARY KEY ("payslip_earning_id")
);

CREATE TABLE IF NOT EXISTS "payslip_deductions" (
  "payslip_deduction_id" BIGSERIAL NOT NULL,
  "payslip_id" BIGINT NOT NULL,
  "deduction_type" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(12,2) NOT NULL,
  "created_at" BIGINT NOT NULL,
  CONSTRAINT "payslip_deductions_pkey" PRIMARY KEY ("payslip_deduction_id")
);

CREATE TABLE IF NOT EXISTS "payslip_audit_logs" (
  "payslip_audit_log_id" BIGSERIAL NOT NULL,
  "payslip_id" BIGINT NOT NULL,
  "action" TEXT NOT NULL,
  "performed_by_id" BIGINT NOT NULL,
  "previous_data" JSONB,
  "updated_data" JSONB,
  "created_at" BIGINT NOT NULL,
  CONSTRAINT "payslip_audit_logs_pkey" PRIMARY KEY ("payslip_audit_log_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "unique_payroll_month_year"
  ON "payroll_runs"("payroll_month", "payroll_year");
CREATE INDEX IF NOT EXISTS "idx_payroll_run_status_period"
  ON "payroll_runs"("status", "payroll_year", "payroll_month");

CREATE UNIQUE INDEX IF NOT EXISTS "payslips_payslip_number_key"
  ON "payslips"("payslip_number");
CREATE UNIQUE INDEX IF NOT EXISTS "unique_employee_payroll_run"
  ON "payslips"("payroll_run_id", "employee_id");
CREATE INDEX IF NOT EXISTS "idx_payslip_employee_generated"
  ON "payslips"("employee_id", "generated_at");
CREATE INDEX IF NOT EXISTS "idx_payslip_status_generated"
  ON "payslips"("status", "generated_at");

CREATE INDEX IF NOT EXISTS "idx_payslip_earning_payslip"
  ON "payslip_earnings"("payslip_id");
CREATE INDEX IF NOT EXISTS "idx_payslip_deduction_payslip"
  ON "payslip_deductions"("payslip_id");
CREATE INDEX IF NOT EXISTS "idx_payslip_audit_payslip_created"
  ON "payslip_audit_logs"("payslip_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_created_by_id_fkey') THEN
    ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_runs_approved_by_id_fkey') THEN
    ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_approved_by_id_fkey"
      FOREIGN KEY ("approved_by_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_payroll_run_id_fkey') THEN
    ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_fkey"
      FOREIGN KEY ("payroll_run_id") REFERENCES "payroll_runs"("payroll_run_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_employee_id_fkey') THEN
    ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey"
      FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_approved_by_id_fkey') THEN
    ALTER TABLE "payslips" ADD CONSTRAINT "payslips_approved_by_id_fkey"
      FOREIGN KEY ("approved_by_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslips_paid_by_id_fkey') THEN
    ALTER TABLE "payslips" ADD CONSTRAINT "payslips_paid_by_id_fkey"
      FOREIGN KEY ("paid_by_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_earnings_payslip_id_fkey') THEN
    ALTER TABLE "payslip_earnings" ADD CONSTRAINT "payslip_earnings_payslip_id_fkey"
      FOREIGN KEY ("payslip_id") REFERENCES "payslips"("payslip_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_deductions_payslip_id_fkey') THEN
    ALTER TABLE "payslip_deductions" ADD CONSTRAINT "payslip_deductions_payslip_id_fkey"
      FOREIGN KEY ("payslip_id") REFERENCES "payslips"("payslip_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_audit_logs_payslip_id_fkey') THEN
    ALTER TABLE "payslip_audit_logs" ADD CONSTRAINT "payslip_audit_logs_payslip_id_fkey"
      FOREIGN KEY ("payslip_id") REFERENCES "payslips"("payslip_id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payslip_audit_logs_performed_by_id_fkey') THEN
    ALTER TABLE "payslip_audit_logs" ADD CONSTRAINT "payslip_audit_logs_performed_by_id_fkey"
      FOREIGN KEY ("performed_by_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
