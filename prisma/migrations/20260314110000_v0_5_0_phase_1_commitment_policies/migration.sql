DROP TABLE IF EXISTS "CommitmentPolicy" CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CommitmentPolicyScope'
  ) THEN
    DROP TYPE "CommitmentPolicyScope";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CommitmentSeverity'
  ) THEN
    DROP TYPE "CommitmentSeverity";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CommitmentPolicyKind'
  ) THEN
    DROP TYPE "CommitmentPolicyKind";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'CommitmentScopeType'
  ) THEN
    DROP TYPE "CommitmentScopeType";
  END IF;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommitmentScopeType" AS ENUM ('WORKSPACE', 'PROJECT', 'TEMPLATE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommitmentPolicyKind" AS ENUM (
    'OVERDUE',
    'REVIEW_STALE',
    'BLOCKED_STALE',
    'UNASSIGNED_STALE',
    'RECURRING_FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CommitmentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "CommitmentPolicy" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "scopeType" "CommitmentScopeType" NOT NULL,
  "scopeId" TEXT NOT NULL,
  "kind" "CommitmentPolicyKind" NOT NULL,
  "thresholdMinutes" INTEGER,
  "thresholdHours" INTEGER,
  "severity" "CommitmentSeverity" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CommitmentPolicy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommitmentPolicy_threshold_check" CHECK (
    (
      "thresholdMinutes" IS NOT NULL
      AND "thresholdHours" IS NULL
      AND "thresholdMinutes" > 0
    )
    OR (
      "thresholdMinutes" IS NULL
      AND "thresholdHours" IS NOT NULL
      AND "thresholdHours" > 0
    )
  )
);

ALTER TABLE "CommitmentPolicy"
ADD CONSTRAINT "CommitmentPolicy_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE UNIQUE INDEX "CommitmentPolicy_workspaceId_scopeType_scopeId_kind_key"
ON "CommitmentPolicy"("workspaceId", "scopeType", "scopeId", "kind");

CREATE INDEX "CommitmentPolicy_workspaceId_isActive_scopeType_scopeId_idx"
ON "CommitmentPolicy"("workspaceId", "isActive", "scopeType", "scopeId");

CREATE INDEX "CommitmentPolicy_workspaceId_kind_isActive_idx"
ON "CommitmentPolicy"("workspaceId", "kind", "isActive");
