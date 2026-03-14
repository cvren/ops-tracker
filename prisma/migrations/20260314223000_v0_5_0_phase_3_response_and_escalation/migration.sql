ALTER TYPE "ActivityEventType"
ADD VALUE IF NOT EXISTS 'EXCEPTION_CASE_OPENED';

ALTER TYPE "ActivityEventType"
ADD VALUE IF NOT EXISTS 'EXCEPTION_CASE_ACKNOWLEDGED';

ALTER TYPE "ActivityEventType"
ADD VALUE IF NOT EXISTS 'EXCEPTION_CASE_SNOOZED';

ALTER TYPE "ActivityEventType"
ADD VALUE IF NOT EXISTS 'EXCEPTION_CASE_ASSIGNED';

ALTER TYPE "ActivityEventType"
ADD VALUE IF NOT EXISTS 'EXCEPTION_CASE_RESOLVED';

DO $$
BEGIN
  CREATE TYPE "ExceptionEmailDeliveryEvent" AS ENUM ('OPENED', 'ASSIGNED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ExceptionEmailDelivery" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "exceptionCaseId" TEXT NOT NULL,
  "event" "ExceptionEmailDeliveryEvent" NOT NULL,
  "recipientUserId" TEXT,
  "recipientEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExceptionEmailDelivery_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  ALTER TABLE "ExceptionEmailDelivery"
  ADD CONSTRAINT "ExceptionEmailDelivery_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ExceptionEmailDelivery"
  ADD CONSTRAINT "ExceptionEmailDelivery_exceptionCaseId_fkey"
  FOREIGN KEY ("exceptionCaseId") REFERENCES "ExceptionCase"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "ExceptionEmailDelivery"
  ADD CONSTRAINT "ExceptionEmailDelivery_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "ExceptionEmailDelivery_workspaceId_deliveredAt_idx"
ON "ExceptionEmailDelivery"("workspaceId", "deliveredAt");

CREATE INDEX IF NOT EXISTS "ExceptionEmailDelivery_exceptionCaseId_createdAt_idx"
ON "ExceptionEmailDelivery"("exceptionCaseId", "createdAt");

CREATE INDEX IF NOT EXISTS "ExceptionEmailDelivery_recipientUserId_deliveredAt_idx"
ON "ExceptionEmailDelivery"("recipientUserId", "deliveredAt");
