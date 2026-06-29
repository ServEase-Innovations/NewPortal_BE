-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Working', 'OnLeave', 'Absent');

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

-- CreateIndex
CREATE INDEX "idx_attendance_composite" ON "attendance"("employee_id", "calendar_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_calendar_date_key" ON "attendance"("employee_id", "calendar_date");

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
