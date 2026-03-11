-- AlterTable
ALTER TABLE "TaskTemplate"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "RecurringSchedule"
ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT;

-- Backfill TaskTemplate authorship
UPDATE "TaskTemplate" AS template
SET
  "createdById" = (
    SELECT membership."userId"
    FROM "Membership" AS membership
    WHERE membership."workspaceId" = template."workspaceId"
    ORDER BY CASE WHEN membership."role" = 'ADMIN' THEN 0 ELSE 1 END, membership."createdAt" ASC
    LIMIT 1
  ),
  "updatedById" = (
    SELECT membership."userId"
    FROM "Membership" AS membership
    WHERE membership."workspaceId" = template."workspaceId"
    ORDER BY CASE WHEN membership."role" = 'ADMIN' THEN 0 ELSE 1 END, membership."createdAt" ASC
    LIMIT 1
  )
WHERE template."createdById" IS NULL
   OR template."updatedById" IS NULL;

-- Backfill RecurringSchedule authorship
UPDATE "RecurringSchedule" AS schedule
SET
  "createdById" = (
    SELECT membership."userId"
    FROM "Membership" AS membership
    WHERE membership."workspaceId" = schedule."workspaceId"
    ORDER BY CASE WHEN membership."role" = 'ADMIN' THEN 0 ELSE 1 END, membership."createdAt" ASC
    LIMIT 1
  ),
  "updatedById" = (
    SELECT membership."userId"
    FROM "Membership" AS membership
    WHERE membership."workspaceId" = schedule."workspaceId"
    ORDER BY CASE WHEN membership."role" = 'ADMIN' THEN 0 ELSE 1 END, membership."createdAt" ASC
    LIMIT 1
  )
WHERE schedule."createdById" IS NULL
   OR schedule."updatedById" IS NULL;

-- AlterTable
ALTER TABLE "TaskTemplate"
ALTER COLUMN "createdById" SET NOT NULL,
ALTER COLUMN "updatedById" SET NOT NULL;

-- AlterTable
ALTER TABLE "RecurringSchedule"
ALTER COLUMN "createdById" SET NOT NULL,
ALTER COLUMN "updatedById" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "TaskTemplate"
ADD CONSTRAINT "TaskTemplate_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate"
ADD CONSTRAINT "TaskTemplate_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule"
ADD CONSTRAINT "RecurringSchedule_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringSchedule"
ADD CONSTRAINT "RecurringSchedule_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
