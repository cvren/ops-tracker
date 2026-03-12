CREATE TYPE "RecurringExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED');

CREATE TYPE "RecurringTriggerSource" AS ENUM ('SYSTEM', 'USER');

ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_EXECUTION_STARTED';

ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_EXECUTION_SUCCEEDED';

ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_EXECUTION_FAILED';

ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_EXECUTION_RERUN';

ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_EXECUTION_SKIPPED';

ALTER TABLE "RecurringExecution"
RENAME COLUMN "scheduleId" TO "recurringScheduleId";

ALTER TABLE "RecurringExecution"
RENAME COLUMN "executedAt" TO "startedAt";

ALTER TABLE "Task"
ADD COLUMN "recurringExecutionId" TEXT;

ALTER TABLE "RecurringExecution"
ADD COLUMN "workspaceId" TEXT,
ADD COLUMN "status" "RecurringExecutionStatus" NOT NULL DEFAULT 'RUNNING',
ADD COLUMN "finishedAt" TIMESTAMP(3),
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "generatedTaskCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "triggeredBy" "RecurringTriggerSource" NOT NULL DEFAULT 'USER',
ADD COLUMN "triggeredByUserId" TEXT,
ADD COLUMN "rerunOfExecutionId" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "RecurringExecution" AS execution
SET "workspaceId" = schedule."workspaceId",
    "status" = 'SUCCESS',
    "finishedAt" = execution."startedAt",
    "generatedTaskCount" = CASE
      WHEN execution."createdTaskId" IS NULL THEN 0
      ELSE 1
    END,
    "triggeredByUserId" = schedule."updatedById",
    "createdAt" = execution."startedAt",
    "updatedAt" = execution."startedAt"
FROM "RecurringSchedule" AS schedule
WHERE schedule."id" = execution."recurringScheduleId";

UPDATE "Task" AS task
SET "recurringExecutionId" = execution."id"
FROM "RecurringExecution" AS execution
WHERE execution."createdTaskId" = task."id";

ALTER TABLE "RecurringExecution"
ALTER COLUMN "workspaceId" SET NOT NULL;

DROP INDEX "RecurringExecution_scheduleId_scheduledFor_key";

DROP INDEX "RecurringExecution_executedAt_idx";

ALTER TABLE "RecurringExecution"
DROP CONSTRAINT "RecurringExecution_createdTaskId_fkey";

ALTER TABLE "RecurringExecution"
DROP COLUMN "createdTaskId";

ALTER TABLE "RecurringExecution"
ADD CONSTRAINT "RecurringExecution_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringExecution"
ADD CONSTRAINT "RecurringExecution_triggeredByUserId_fkey"
FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringExecution"
ADD CONSTRAINT "RecurringExecution_rerunOfExecutionId_fkey"
FOREIGN KEY ("rerunOfExecutionId") REFERENCES "RecurringExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_recurringExecutionId_fkey"
FOREIGN KEY ("recurringExecutionId") REFERENCES "RecurringExecution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RecurringExecution_recurringScheduleId_scheduledFor_idx"
ON "RecurringExecution"("recurringScheduleId", "scheduledFor");

CREATE INDEX "RecurringExecution_workspaceId_startedAt_idx"
ON "RecurringExecution"("workspaceId", "startedAt");

CREATE INDEX "RecurringExecution_status_startedAt_idx"
ON "RecurringExecution"("status", "startedAt");

CREATE INDEX "Task_recurringExecutionId_idx"
ON "Task"("recurringExecutionId");
