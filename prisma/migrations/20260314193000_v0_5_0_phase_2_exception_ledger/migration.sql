DROP TABLE IF EXISTS "ExceptionCase" CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ExceptionResolutionKind'
  ) THEN
    DROP TYPE "ExceptionResolutionKind";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'ExceptionStatus'
  ) THEN
    DROP TYPE "ExceptionStatus";
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExceptionStatus" AS ENUM (
    'OPEN',
    'ACKNOWLEDGED',
    'SNOOZED',
    'RESOLVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ExceptionResolutionKind" AS ENUM ('AUTO', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "ExceptionCase" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "kind" "CommitmentPolicyKind" NOT NULL,
  "status" "ExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "severity" "CommitmentSeverity" NOT NULL,
  "sourcePolicyId" TEXT NOT NULL,
  "taskId" TEXT,
  "recurringExecutionId" TEXT,
  "ownerId" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt" TIMESTAMP(3),
  "snoozedUntil" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "resolutionKind" "ExceptionResolutionKind",
  "fingerprint" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ExceptionCase_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExceptionCase_source_check" CHECK (
    (
      "taskId" IS NOT NULL
      AND "recurringExecutionId" IS NULL
    )
    OR (
      "taskId" IS NULL
      AND "recurringExecutionId" IS NOT NULL
    )
  ),
  CONSTRAINT "ExceptionCase_resolution_check" CHECK (
    (
      "status" = 'RESOLVED'
      AND "resolvedAt" IS NOT NULL
      AND "resolutionKind" IS NOT NULL
    )
    OR (
      "status" <> 'RESOLVED'
      AND "resolvedAt" IS NULL
      AND "resolutionKind" IS NULL
    )
  )
);

ALTER TABLE "ExceptionCase"
ADD CONSTRAINT "ExceptionCase_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ExceptionCase"
ADD CONSTRAINT "ExceptionCase_sourcePolicyId_fkey"
FOREIGN KEY ("sourcePolicyId") REFERENCES "CommitmentPolicy"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ExceptionCase"
ADD CONSTRAINT "ExceptionCase_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ExceptionCase"
ADD CONSTRAINT "ExceptionCase_recurringExecutionId_fkey"
FOREIGN KEY ("recurringExecutionId") REFERENCES "RecurringExecution"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ExceptionCase"
ADD CONSTRAINT "ExceptionCase_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "ExceptionCase_workspaceId_fingerprint_idx"
ON "ExceptionCase"("workspaceId", "fingerprint");

CREATE INDEX "ExceptionCase_workspaceId_status_severity_openedAt_idx"
ON "ExceptionCase"("workspaceId", "status", "severity", "openedAt");

CREATE INDEX "ExceptionCase_sourcePolicyId_status_idx"
ON "ExceptionCase"("sourcePolicyId", "status");

CREATE INDEX "ExceptionCase_taskId_status_idx"
ON "ExceptionCase"("taskId", "status");

CREATE INDEX "ExceptionCase_recurringExecutionId_status_idx"
ON "ExceptionCase"("recurringExecutionId", "status");

CREATE UNIQUE INDEX "ExceptionCase_workspaceId_fingerprint_active_key"
ON "ExceptionCase"("workspaceId", "fingerprint")
WHERE "status" IN ('OPEN', 'ACKNOWLEDGED', 'SNOOZED');
