/*
  Warnings:

  - The primary key for the `attendance` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `attendance_id` on the `attendance` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.

*/
-- Alter the column type
ALTER TABLE "attendance"
ALTER COLUMN "attendance_id" TYPE INTEGER USING "attendance_id"::INTEGER;

-- Create a sequence
CREATE SEQUENCE IF NOT EXISTS attendance_attendance_id_seq;

-- Set the default to use the sequence
ALTER TABLE "attendance"
ALTER COLUMN "attendance_id"
SET DEFAULT nextval('attendance_attendance_id_seq');

-- Make the sequence owned by the column
ALTER SEQUENCE attendance_attendance_id_seq
OWNED BY "attendance"."attendance_id";

-- Set the sequence to the current maximum ID
SELECT setval(
'attendance_attendance_id_seq',
COALESCE((SELECT MAX(attendance_id) FROM "attendance"), 1),
true
);

-- Recreate the primary key
ALTER TABLE "attendance"
DROP CONSTRAINT IF EXISTS "attendance_pkey",
ADD CONSTRAINT "attendance_pkey" PRIMARY KEY ("attendance_id");