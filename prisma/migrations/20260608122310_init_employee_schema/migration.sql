-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('SuperAdmin', 'Manager', 'Developer', 'Marketing', 'CustomStaff');

-- CreateEnum
CREATE TYPE "AppraisalState" AS ENUM ('Pristine', 'AppraisalConsideration', 'PerformanceWarning');

-- CreateTable
CREATE TABLE "employees" (
    "employee_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email_address" TEXT NOT NULL,
    "assigned_role" "EmployeeRole" NOT NULL DEFAULT 'Developer',
    "assigned_department" TEXT NOT NULL,
    "appraisal_state" "AppraisalState" NOT NULL DEFAULT 'Pristine',
    "private_admin_notes" TEXT,
    "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "manager_id" TEXT,
    "team_id" TEXT,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("employee_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_address_key" ON "employees"("email_address");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("employee_id") ON DELETE SET NULL ON UPDATE CASCADE;
