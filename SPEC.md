# SPEC

## Product

- Project name: `ops-tracker`
- Current shipped release: `v0.3.0`
- Current implementation workstream: `ops-tracker v0.4.0 Phase 4 — Release Closeout`
- `v0.4.0` theme: `Delegation you can trust, automation you can inspect`
- Package name prefix: `@ops-tracker/*`
- Docker Compose project name: `ops-tracker`
- Environment variable prefix: `OPS_TRACKER_`

## Current repo truth

- Current branch-head `package.json` version is `0.4.0`
- Local tag `v0.3.0` exists and remains the current shipped release marker
- The current branch head is a release-ready `v0.4.0` candidate; it is not shipped until PR / merge / tag / GitHub Release complete
- The current repo runtime now uses `Membership.role` as the workspace-scoped role source of truth with `ADMIN`, `MANAGER`, `MEMBER`, and `VIEWER`
- Admins can promote a workspace member to `MANAGER` and demote a manager back to `MEMBER` from the existing workspace membership UI and actions
- Managers cannot re-delegate manager access, manage workspace membership, or change workspace-root settings
- Manager-console routes and mutations now allow `ADMIN` and `MANAGER` while keeping `MEMBER` out of manager-only actions and keeping `VIEWER` read-only
- Role changes now write activity trace through `MEMBERSHIP_ROLE_CHANGED` plus `MANAGER_ROLE_GRANTED` or `MANAGER_ROLE_REVOKED`
- Seed data now includes dedicated `admin`, `manager`, `member`, and `viewer` demo users
- Manual recurring generation through `Generate now` now always writes a `RecurringExecution` ledger row
- `RecurringExecution` now matches the `v0.4.0 Phase 0` contract shape with workspace, status, timing, trigger provenance, generated-task count, and failure detail
- Generated tasks now link back to their source execution through `Task.recurringExecutionId`
- Template recurring history now reads from the execution ledger and exposes success, failed, skipped, and running rows
- Failed executions are now rerunnable by managers, and rerun creates a fresh execution row instead of mutating the failed one
- Activity trace now records recurring execution start, success, failure, and rerun events for both `USER` and `SYSTEM` attempts
- `corepack pnpm recurring:tick` now exists as the single scheduled entrypoint
- Scheduled tick now selects active due schedules, runs them through the same recurring pipeline as manual `Generate now`, and writes `SYSTEM` executions into the ledger
- Duplicate-safe slot claims are now enforced through the database with a partial unique index on `RUNNING`, `SUCCESS`, and `SKIPPED` answers for the same `recurringScheduleId + scheduledFor` slot
- After a fresh seed, `corepack pnpm recurring:tick` currently produces one new `SYSTEM` success for `Scheduled inventory digest`, reports one skipped due slot for `Recovery retry drill`, and leaves the seeded failed execution visible for rerun
- `SKIPPED` remains part of the contract, Prisma schema, seeded history, and UI status palette, but the current runtime does not expose a manager skip action and tick-summary skips do not create a fresh execution ledger row

## Contract documents

- Primary `v0.4.0` contract: `docs/contracts/v0.4.0-operating-contract.md`
- `v0.4.0` handoff note: `docs/handoffs/v0.3.0-to-v0.4.0.md`
- `v0.5.0` handoff note: `docs/handoffs/v0.4.0-to-v0.5.0.md`
- Repo status tracker: `STATUS.md`

## Phase 4 objective

`ops-tracker v0.4.0 Phase 4 — Release Closeout` fixes the current branch head as the release-ready `v0.4.0` candidate without claiming it is already shipped.

Its job is to:

1. reconcile docs, validation, and release notes to one current-head truth
2. separate shipped `v0.3.0` history from the release-ready `v0.4.0` branch head
3. observe or explicitly block current-head GitHub-hosted `ci`
4. record exact next human steps for PR, merge, tag, and GitHub Release
5. hand off a clean `v0.4.0 -> v0.5.0` baseline in repo markdown

## Delivered Phase 3 boundary

- Role and delegation baseline retained:
  - `admin`
  - `manager`
  - `member`
  - `viewer`
- Delegated manager-console scope retained:
  - dashboard
  - manager queue views
  - bulk actions
  - templates
  - recurring schedules
  - manual `Generate now`
- Admin-only exclusions retained:
  - workspace root settings
  - membership-wide management
  - manager re-delegation
  - system-level scheduler configuration
- Guarding rules retained:
  - route gating, server actions, and permission helpers still share the same role model
  - manager-only navigation stays hidden from `member` and `viewer`
  - `viewer` write actions remain blocked with explicit read-only messaging
- Recurring ledger rollout:
  - `RecurringExecution` now stores `workspaceId`, `status`, `scheduledFor`, `startedAt`, `finishedAt`, `errorMessage`, `generatedTaskCount`, `triggeredBy`, and `triggeredByUserId`
  - `manual Generate now` now creates `RUNNING` rows first, then resolves to `SUCCESS` or `FAILED`
  - seeded history includes `SUCCESS`, `FAILED`, `SKIPPED`, and `RUNNING` samples for inspection
  - generated tasks now link to their execution origin
- Scheduled execution rollout:
  - `corepack pnpm recurring:tick` now runs active due schedules through the same recurring pipeline as manual execution and rerun
  - scheduled attempts write `triggeredBy = SYSTEM` and `triggeredByUserId = null`
  - due selection is based on `nextRunAt <= now`
  - cadence and interval still determine the next slot through the existing `calculateNextRunAt` helper
- Execution history and rerun:
  - managers can inspect manual and scheduled execution history inside the templates console
  - failed scheduled executions remain visible instead of disappearing behind scheduler state
  - rerun still creates a new execution record for the same slot and can recover a scheduled failure
  - generated tasks remain linked back to the execution that created them
- Duplicate-safe runtime:
  - slot claims for `RUNNING`, `SUCCESS`, and `SKIPPED` answers are now protected with a database partial unique index
  - scheduled tick skips already-failed slots so it does not auto-rerun recovery work
  - after a fresh seed, the canonical tick outcome is one new scheduled `SUCCESS` plus one skipped due slot because `Recovery retry drill` already has a seeded failed execution
- Audit rules:
  - recurring execution lifecycle now records `RECURRING_EXECUTION_STARTED`, `RECURRING_EXECUTION_SUCCEEDED`, `RECURRING_EXECUTION_FAILED`, and `RECURRING_EXECUTION_RERUN`

## Explicitly deferred after Phase 3

- skip action UI and skip execution action
- notification fan-out for recurring execution
- background worker or queue infrastructure
- advanced retry policy
- holiday and business-day scheduling
- advanced RRULE support
- a dedicated cross-schedule execution history screen
- any `v0.5.0` product implementation

## v0.4.0 non-goals

- full RBAC matrix
- custom role builder
- advanced capability editor
- background worker or queue orchestration platform
- holiday calendar
- business-day due calculation
- advanced RRULE recurrence
- Slack, email, or push notification expansion
- analytics, BI, or forecasting
- workflow automation builder
- organization hierarchy

## Technical constraints

- Keep the existing Next.js, TypeScript, Prisma, PostgreSQL, pnpm, Vitest, Playwright, Tailwind, Docker Compose, and GitHub Actions stack
- Keep `Membership.role` and the existing permission helpers as the single role boundary instead of introducing a parallel capability system
- Keep membership and workspace management modeled through the existing UI and actions; do not rebuild the membership model for `v0.4.0`
- Keep shipped-release messaging on `v0.3.0` until humans complete merge, tag `v0.4.0`, and GitHub Release publication
- Keep `corepack pnpm recurring:tick` as a single tick entrypoint instead of widening into a worker platform
- Keep skip optional and prefer rerun for visible operator recovery

## Validation commands for Phase 4

```bash
corepack pnpm install
docker compose up -d
corepack pnpm exec prisma generate
corepack pnpm exec prisma migrate deploy || corepack pnpm exec prisma migrate dev
corepack pnpm db:seed
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
corepack pnpm recurring:tick
```
