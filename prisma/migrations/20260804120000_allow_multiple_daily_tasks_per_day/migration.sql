-- Allow an employee to submit more than one daily task report per day.
-- Drops the (employee_id, submission_date) uniqueness constraint and
-- replaces it with a plain (non-unique) index to keep lookups fast.

DROP INDEX IF EXISTS "daily_task_submissions_employee_id_submission_date_key";

CREATE INDEX IF NOT EXISTS "idx_daily_task_employee_date"
ON "daily_task_submissions" ("employee_id", "submission_date");