# PLAN

## Release baseline

- Current shipped release remains `v0.4.0`
- Current branch-head `package.json` version remains `0.4.0`
- The current repo runtime remains the shipped `v0.4.0` baseline
- `v0.5.0` started docs-first; `Phase 0` fixed contract boundaries before runtime work began

## v0.5.0 phase order

1. `ops-tracker v0.5.0 Phase 0 — Commitment Contract`
   - Status: completed
   - Depends on: current repo audit of shipped `v0.4.0` runtime and docs
   - Acceptance criteria:
     - `docs/contracts/v0.5.0-commitment-contract.md` exists
     - `CommitmentPolicy` and `ExceptionCase` shapes are fixed in repo docs
     - exception kinds, statuses, invariants, dedupe rule, phase order, and non-goals are fixed
     - shipped `v0.4.0` truth and future `v0.5.0` scope remain clearly separated
2. `ops-tracker v0.5.0 Phase 1 — Commitment Policies`
   - Status: completed
   - Depends on: `Phase 0`
   - Acceptance criteria:
     - `CommitmentPolicy` becomes a persisted runtime model with the fixed fields `id`, `workspaceId`, `name`, `scopeType`, `scopeId`, `kind`, threshold, `severity`, `isActive`, and timestamps
     - supported scope types remain exactly `WORKSPACE`, `PROJECT`, and `TEMPLATE`
     - supported kinds remain exactly `OVERDUE`, `REVIEW_STALE`, `BLOCKED_STALE`, `UNASSIGNED_STALE`, and `RECURRING_FAILED`
     - thresholds remain bounded to `thresholdMinutes` or `thresholdHours`
     - policy activation and editing stay inside the fixed contract without becoming a generic builder
     - manager-console UI supports bounded policy create and edit for admins and managers with loading, empty, error, and success states
     - task, dashboard, and recurring surfaces can read policy-derived risk metadata before `ExceptionCase` exists
     - seed, unit tests, and e2e cover a five-minute Phase 1 demo path
3. `ops-tracker v0.5.0 Phase 2 — Exception Ledger`
   - Status: completed
   - Depends on: `Phase 0`, `Phase 1`
   - Acceptance criteria:
     - `ExceptionCase` becomes a persisted source-of-truth ledger with the fixed contract shape
     - opening logic covers the five fixed exception kinds
     - dedupe converges same source, same kind, and same policy into one open case
     - cleared conditions auto-resolve existing cases where possible
     - manager-console queue exposes open exception work objects with source drill-through
     - dashboard, task queues, and recurring templates read open exception-ledger truth
     - seed, unit tests, and e2e cover a five-minute Phase 2 demo path
     - downstream delivery reads from the exception ledger instead of inventing a parallel truth
4. `ops-tracker v0.5.0 Phase 3 — Response & Escalation`
   - Status: completed
   - Depends on: `Phase 0`, `Phase 1`, `Phase 2`
   - Acceptance criteria:
     - managers can acknowledge, snooze, assign, and manually resolve cases
     - case status stays bounded to `OPEN`, `ACKNOWLEDGED`, `SNOOZED`, and `RESOLVED`
     - `ownerId`, `acknowledgedAt`, `snoozedUntil`, `resolvedAt`, and `resolutionKind` are updated through bounded response actions
     - actionable and snoozed exception work stay readable on `/exceptions`
     - one outbound channel exists as a derived email projection from `ExceptionCase`
     - no full incident platform or full multi-channel delivery matrix is introduced
5. `ops-tracker v0.5.0 Phase 4 — Release Closeout`
   - Status: completed
   - Depends on: `Phase 1`, `Phase 2`, `Phase 3`
   - Acceptance criteria:
     - docs, tests, validation notes, and release notes describe the same delivered `v0.5.0` boundary
     - shipped `v0.4.0` history and delivered `v0.5.0` scope remain clearly separated
     - validation results are recorded for the delivered runtime
     - current branch-head hosted `ci` result is observed or blocked explicitly
     - remaining blockers are explicit

## Current cycle

- Scope: `ops-tracker v0.5.0 Phase 4 — Release Closeout`
- Status: completed
- Checklist:
  - `[done]` observed the latest hosted GitHub Actions run on `origin/main` and recorded the exact blocker for the unpushed local `v0.5.0` tree
  - `[done]` reconciled `README.md`, `SPEC.md`, `PLAN.md`, `STATUS.md`, `RELEASE_NOTES_v0.5.0.md`, and `docs/handoffs/v0.4.0-to-v0.5.0.md` to one release-ready `v0.5.0` boundary
  - `[done]` created `docs/handoffs/v0.5.0-to-v0.6.0.md` to carry forward limits and the next-line start point
  - `[done]` fixed the exact local validation target and the exact human PR, merge, tag, and GitHub Release steps

## Architecture decisions

- `CommitmentPolicy` is the official `v0.5.0` commitment model
- `CommitmentPolicy.scopeType` is fixed to `WORKSPACE`, `PROJECT`, and `TEMPLATE`
- `CommitmentPolicy.kind` is fixed to `OVERDUE`, `REVIEW_STALE`, `BLOCKED_STALE`, `UNASSIGNED_STALE`, and `RECURRING_FAILED`
- `CommitmentPolicy` thresholds are bounded to `thresholdMinutes` or `thresholdHours` instead of a generic expression system
- `CommitmentPolicy` severity is fixed to `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`
- Phase 1 risk metadata was derived directly from active `CommitmentPolicy` evaluation before `ExceptionCase` existed
- `WORKSPACE` scope binds to the current workspace id; `PROJECT` and `TEMPLATE` scope bind to ids inside the same workspace
- `ExceptionCase` is the `v0.5.0` source-of-truth exception ledger and work object
- `ExceptionCase.status` is fixed to `OPEN`, `ACKNOWLEDGED`, `SNOOZED`, and `RESOLVED`
- `ExceptionCase.resolutionKind` is fixed to `AUTO` and `MANUAL`
- `fingerprint` is the stable dedupe key for same-source, same-kind, same-policy convergence
- active manager surfaces now rebuild risk metadata from open `ExceptionCase` rows instead of direct policy hits
- `/exceptions` is the bounded manager response queue for actionable and snoozed case work
- `ACKNOWLEDGED`, `SNOOZED`, `RESOLVED`, `ownerId`, `acknowledgedAt`, `snoozedUntil`, and `resolvedAt` are written on `ExceptionCase` rather than a parallel response model
- expired snoozes reopen into `ACKNOWLEDGED` when the case had already been seen, otherwise into `OPEN`
- outbound delivery currently stays bounded to one derived email channel through `ExceptionEmailDelivery`
- auto-resolve is preferred when the underlying condition clears; manual resolve remains supportive
- workspace membership role controls use `name + email` accessibility labels so duplicate display names remain uniquely targetable
- the Playwright app spec reseeds the canonical demo baseline before each test so historical compatibility flows stay isolated
- hosted GitHub Actions observation for `v0.5.0` can only apply to a pushed ref; the current local working tree remains blocked from hosted observation until commit and push
- `v0.5.0` does not widen into a generic policy builder, custom rule engine, or full incident platform
- `UNASSIGNED_STALE` currently anchors on task `createdAt` until a dedicated unassigned-since field exists in a later phase
- `Phase 3` keeps `ExceptionCase` as the active branch-head truth for open exceptions while adding bounded response controls and one derived email channel

## Validation strategy

```bash
corepack pnpm exec prisma generate
docker compose up -d
docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U ops_tracker -d ops_tracker < prisma/migrations/20260314223000_v0_5_0_phase_3_response_and_escalation/migration.sql
node --env-file=.env.example --import tsx prisma/seed.ts
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
cp .env.example .env && corepack pnpm recurring:tick
git diff --check
```

Hosted GitHub Actions observation:

- `origin/main` commit `2afe999a47fa29133897d736240922a144e66f3d`
- run `#25` on March 12, 2026: `https://github.com/cvren/ops-tracker/actions/runs/22985172776`
- `validate`: `success`
- `e2e`: `success`
- blocker: the local `v0.5.0` release-ready tree is not yet committed and pushed, so no hosted run exists for the exact current repo truth
