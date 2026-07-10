-- This migration is additive. It does not alter existing Employee, Team, or
-- Attendance columns, constraints, or data.

-- CreateEnum (safe to retry after a partially applied migration)
DO $$
BEGIN
    CREATE TYPE "DailyTaskStatus" AS ENUM ('Pending', 'Completed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_task_submissions" (
    "daily_task_submission_id" BIGSERIAL NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "work_description" TEXT NOT NULL,
    "status" "DailyTaskStatus" NOT NULL DEFAULT 'Pending',
    "new_ideas" TEXT,
    "submission_date" BIGINT NOT NULL,
    "submitted_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "daily_task_submissions_pkey" PRIMARY KEY ("daily_task_submission_id")
);

CREATE TABLE IF NOT EXISTS "daily_task_jira_links" (
    "daily_task_jira_link_id" BIGSERIAL NOT NULL,
    "daily_task_submission_id" BIGINT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "created_at" BIGINT NOT NULL,

    CONSTRAINT "daily_task_jira_links_pkey" PRIMARY KEY ("daily_task_jira_link_id")
);

CREATE TABLE IF NOT EXISTS "daily_task_attachments" (
    "daily_task_attachment_id" BIGSERIAL NOT NULL,
    "daily_task_submission_id" BIGINT NOT NULL,
    "file_name" TEXT NOT NULL,
    "stored_file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" BIGINT NOT NULL,
    "uploaded_at" BIGINT NOT NULL,

    CONSTRAINT "daily_task_attachments_pkey" PRIMARY KEY ("daily_task_attachment_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "daily_task_submissions_employee_id_submission_date_key"
    ON "daily_task_submissions"("employee_id", "submission_date");

CREATE INDEX IF NOT EXISTS "idx_daily_task_submission_date"
    ON "daily_task_submissions"("submission_date");

CREATE INDEX IF NOT EXISTS "idx_daily_task_status_date"
    ON "daily_task_submissions"("status", "submission_date");

CREATE INDEX IF NOT EXISTS "idx_daily_task_jira_submission"
    ON "daily_task_jira_links"("daily_task_submission_id");

CREATE INDEX IF NOT EXISTS "idx_daily_task_attachment_submission"
    ON "daily_task_attachments"("daily_task_submission_id");

-- AddForeignKey (safe to retry after a partially applied migration)
DO $$
BEGIN
    ALTER TABLE "daily_task_submissions"
        ADD CONSTRAINT "daily_task_submissions_employee_id_fkey"
        FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "daily_task_jira_links"
        ADD CONSTRAINT "daily_task_jira_links_daily_task_submission_id_fkey"
        FOREIGN KEY ("daily_task_submission_id")
        REFERENCES "daily_task_submissions"("daily_task_submission_id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE "daily_task_attachments"
        ADD CONSTRAINT "daily_task_attachments_daily_task_submission_id_fkey"
        FOREIGN KEY ("daily_task_submission_id")
        REFERENCES "daily_task_submissions"("daily_task_submission_id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;