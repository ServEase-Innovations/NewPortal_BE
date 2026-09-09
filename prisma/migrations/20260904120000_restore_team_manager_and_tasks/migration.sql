-- Idempotent restore: safely re-creates manager_id / tasks / related enums
-- regardless of whether they currently exist. Safe to run more than once.

-- CreateEnum (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskStatus') THEN
    CREATE TYPE "TaskStatus" AS ENUM ('Todo', 'InProgress', 'InReview', 'Done', 'Blocked');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaskPriority') THEN
    CREATE TYPE "TaskPriority" AS ENUM ('Low', 'Medium', 'High', 'Urgent');
  END IF;
END $$;

-- AlterTable: add manager_id back if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'teams' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE "teams" ADD COLUMN "manager_id" BIGINT;
  END IF;
END $$;

-- Backfill any null manager_id using the earliest Manager/SuperAdmin
DO $$
DECLARE
  fallback_manager_id BIGINT;
BEGIN
  SELECT "employee_id" INTO fallback_manager_id
  FROM "employees"
  WHERE "assigned_role" IN ('Manager', 'SuperAdmin')
  ORDER BY "employee_id" ASC
  LIMIT 1;

  IF fallback_manager_id IS NOT NULL THEN
    UPDATE "teams"
    SET "manager_id" = fallback_manager_id
    WHERE "manager_id" IS NULL;
  END IF;
END $$;

-- Enforce NOT NULL only if every row now has an owner
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "teams" WHERE "manager_id" IS NULL)
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'teams' AND column_name = 'manager_id' AND is_nullable = 'YES'
     )
  THEN
    ALTER TABLE "teams" ALTER COLUMN "manager_id" SET NOT NULL;
  END IF;
END $$;

-- CreateIndex (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_team_manager') THEN
    CREATE INDEX "idx_team_manager" ON "teams"("manager_id");
  END IF;
END $$;

-- AddForeignKey (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'teams_manager_id_fkey'
  ) THEN
    ALTER TABLE "teams" ADD CONSTRAINT "teams_manager_id_fkey"
      FOREIGN KEY ("manager_id") REFERENCES "employees"("employee_id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable: tasks (only if missing)
CREATE TABLE IF NOT EXISTS "tasks" (
    "task_id" BIGSERIAL NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'Todo',
    "priority" "TaskPriority" NOT NULL DEFAULT 'Medium',
    "assigned_to_id" BIGINT,
    "created_by_id" BIGINT NOT NULL,
    "due_date" BIGINT,
    "completed_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "updated_at" BIGINT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("task_id")
);

-- CreateIndex (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_task_team_status') THEN
    CREATE INDEX "idx_task_team_status" ON "tasks"("team_id", "status");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_task_assignee') THEN
    CREATE INDEX "idx_task_assignee" ON "tasks"("assigned_to_id");
  END IF;
END $$;

-- AddForeignKey (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_team_id_fkey'
  ) THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("team_id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_assigned_to_id_fkey'
  ) THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_to_id_fkey"
      FOREIGN KEY ("assigned_to_id") REFERENCES "employees"("employee_id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_created_by_id_fkey'
  ) THEN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey"
      FOREIGN KEY ("created_by_id") REFERENCES "employees"("employee_id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;