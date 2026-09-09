-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('Success', 'Warning', 'Info', 'Error');

-- CreateTable
CREATE TABLE "notifications" (
    "notification_id" BIGSERIAL NOT NULL,
    "employee_id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "action_url" TEXT,
    "action_label" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" BIGINT,
    "created_at" BIGINT NOT NULL,
    "expires_at" BIGINT,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id")
);

-- CreateIndex
CREATE INDEX "idx_notification_employee_read_created" ON "notifications"("employee_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "idx_notification_employee_created" ON "notifications"("employee_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE CASCADE ON UPDATE CASCADE;
