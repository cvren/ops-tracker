-- CreateEnum
CREATE TYPE "RecurringCadence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'TASK_BULK_UPDATED';

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'TASK_CREATED_FROM_TEMPLATE';

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'TASK_TEMPLATE_CREATED';

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'TASK_TEMPLATE_UPDATED';

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_SCHEDULE_CREATED';

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_SCHEDULE_UPDATED';

-- AlterEnum
ALTER TYPE "ActivityEventType" ADD VALUE 'RECURRING_SCHEDULE_EXECUTED';

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultAssigneeId" TEXT,
    "defaultReviewerId" TEXT,
    "defaultDueOffsetDays" INTEGER,
    "defaultPriority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "defaultStatus" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringSchedule" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "cadence" "RecurringCadence" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringExecution" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdTaskId" TEXT,

    CONSTRAINT "RecurringExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskTemplate_workspaceId_name_key" ON "TaskTemplate"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "TaskTemplate_workspaceId_updatedAt_idx" ON "TaskTemplate"("workspaceId", "updatedAt");

-- CreateIndex
CREATE INDEX "RecurringSchedule_workspaceId_isActive_nextRunAt_idx" ON "RecurringSchedule"("workspaceId", "isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "RecurringSchedule_projectId_isActive_idx" ON "RecurringSchedule"("projectId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringExecution_scheduleId_scheduledFor_key" ON "RecurringExecution"("scheduleId", "scheduledFor");

-- CreateIndex
CREATE INDEX "RecurringExecution_executedAt_idx" ON "RecurringExecution"("executedAt");

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_defaultReviewerId_fkey" FOREIGN KEY ("defaultReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule" ADD CONSTRAINT "RecurringSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExecution" ADD CONSTRAINT "RecurringExecution_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RecurringSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringExecution" ADD CONSTRAINT "RecurringExecution_createdTaskId_fkey" FOREIGN KEY ("createdTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
