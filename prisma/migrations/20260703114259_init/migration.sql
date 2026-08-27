/*
  Warnings:

  - The values [AppraisalConsideration,PerformanceWarning] on the enum `AppraisalState` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `attendance_id` on the `attendance` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AppraisalState_new" AS ENUM ('Pristine', 'InProgress', 'Completed');
ALTER TABLE "public"."employees" ALTER COLUMN "appraisal_state" DROP DEFAULT;
ALTER TABLE "employees" ALTER COLUMN "appraisal_state" TYPE "AppraisalState_new" USING ("appraisal_state"::text::"AppraisalState_new");
ALTER TYPE "AppraisalState" RENAME TO "AppraisalState_old";
ALTER TYPE "AppraisalState_new" RENAME TO "AppraisalState";
DROP TYPE "public"."AppraisalState_old";
ALTER TABLE "employees" ALTER COLUMN "appraisal_state" SET DEFAULT 'Pristine';
COMMIT;

-- Align employee identifiers with the current bigint-based schema before
-- later migrations add bigint foreign keys to employees.
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_employee_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT "employees_manager_id_fkey";
ALTER TABLE "employees" DROP CONSTRAINT "employees_pkey";

ALTER TABLE "employees"
ALTER COLUMN "employee_id" SET DATA TYPE BIGINT USING "employee_id"::bigint,
ALTER COLUMN "manager_id" SET DATA TYPE BIGINT USING "manager_id"::bigint;

ALTER TABLE "attendance"
ALTER COLUMN "employee_id" SET DATA TYPE BIGINT USING "employee_id"::bigint;

ALTER TABLE "employees" ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("employee_id");
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey"
  FOREIGN KEY ("manager_id") REFERENCES "employees"("employee_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_pkey",
ALTER COLUMN "attendance_id" SET DATA TYPE INTEGER USING "attendance_id"::integer,
ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id");

