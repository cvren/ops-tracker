# SPEC

## Product

- Project name: `ops-tracker`
- Current shipped release: `v0.4.0`
- Current implementation workstream: `ops-tracker v0.5.0 Phase 4 — Release Closeout`
- `v0.5.0` theme: `Operational commitments become actionable exceptions`
- `v0.5.0` subtheme: `Problems stop being alerts and start becoming work`
- Package name prefix: `@ops-tracker/*`
- Docker Compose project name: `ops-tracker`
- Environment variable prefix: `OPS_TRACKER_`

## Current repo truth

- Current branch-head `package.json` version is `0.4.0`
- The shipped runtime baseline remains `ops-tracker v0.4.0`
- The current repo runtime retains the shipped four-role workspace model plus the `RecurringExecution` source-of-truth recurring ledger from `v0.4.0`
- `Membership.role` remains the workspace-scoped role source of truth for the shipped runtime
- `corepack pnpm recurring:tick` remains the shipped scheduled recurring entrypoint
- shipped release remains `v0.4.0`, but the current branch head now includes `v0.5.0 Phase 1` commitment policy work, `Phase 2` exception ledger work, and `Phase 3` response workflow work
- the current local branch head now also includes `v0.5.0 Phase 4` release-closeout docs, release notes, next-line handoff, and release-ready next steps
- `CommitmentPolicy` now exists in schema, the checked-in Phase 1 migration, seed data, runtime evaluation helpers, validation, and manager-console UI
- `ExceptionCase` now exists in schema, the checked-in Phase 2 and Phase 3 migrations, seed sync, runtime reconciliation, response actions, manager queue UI, and Phase 3 tests
- dashboard, task queues, recurring template views, and `/exceptions` now read open exception-ledger data as the current branch-head risk truth
- `/exceptions` now supports acknowledge, snooze, owner assignment, and manual resolve on active cases
- outbound delivery remains derived from `ExceptionCase`; the current branch head only adds a single derived email channel through `ExceptionEmailDelivery`
- the current local release-ready validation target now covers lint, typecheck, unit tests, full Playwright app e2e, build, and `recurring:tick`
- GitHub-hosted `ci` has been observed `success` on `origin/main` commit `2afe999a47fa29133897d736240922a144e66f3d` on March 12, 2026, with both `validate` and `e2e` succeeding
- the exact current local `v0.5.0` working tree still has no hosted CI observation because it is not yet committed and pushed
- shipped `v0.4.0` history remains separate from the current in-progress `v0.5.0` branch work

## Contract documents

- Primary shipped contract: `docs/contracts/v0.4.0-operating-contract.md`
- Primary `v0.5.0` contract: `docs/contracts/v0.5.0-commitment-contract.md`
- Shipped release handoff: `docs/handoffs/v0.3.0-to-v0.4.0.md`
- Forward handoff: `docs/handoffs/v0.4.0-to-v0.5.0.md`
- Repo status tracker: `STATUS.md`

## v0.5.0 objective

`ops-tracker v0.5.0` promotes overdue, stale, blocked, unassigned, and recurring-failure conditions out of passive alerting and into owned response work.

`v0.5.0 Phase 4 — Release Closeout` fixes the release-ready boundary after Phases 1 through 3 by reconciling validation truth, release notes, handoffs, and hosted-CI observation.

`v0.5.0` now delivers:

1. the persisted `CommitmentPolicy` model with the fixed Phase 0 shape and fixed five kinds
2. a persisted `ExceptionCase` ledger with the fixed Phase 0 shape, statuses, and resolution boundary
3. deduped open-case creation for same source, same kind, and same policy through a stable `fingerprint`
4. minimal auto-resolve when the underlying source condition clears
5. a manager exception queue on `/exceptions` that links back to the source task or recurring execution and separates actionable versus snoozed work
6. exception-ledger-backed risk metadata across dashboard, task queues, and recurring templates
7. bounded acknowledge, snooze, owner assignment, and manual resolve actions on `ExceptionCase`
8. one derived outbound channel through `ExceptionEmailDelivery` for critical opens and owner assignment
9. representative seed data plus unit and e2e coverage for the Phase 3 boundary
10. release-closeout docs, release notes, and next-human-step guidance for PR, merge, tag, and GitHub Release

## Shipped v0.4.0 baseline retained

- Workspace roles remain `admin`, `manager`, `member`, and `viewer`
- Manager-console delegation, recurring execution history, rerun, and scheduled tick behavior remain as shipped in `v0.4.0`
- `RecurringExecution` remains the shipped recurring ledger for manual, scheduled, and rerun execution
- The current inbox and notification surfaces remain part of the shipped `v0.4.0` product baseline

## Explicitly deferred after v0.5.0 Phase 3

- multi-channel delivery
- digest matrix
- advanced escalation builder
- forecasting or BI

## v0.5.0 non-goals

- full incident platform
- generic automation builder
- policy builder UI
- full multi-channel delivery matrix
- advanced SLA prediction
- org hierarchy
- BI or forecasting
- arbitrary custom rule engine

## Technical constraints

- Keep the existing Next.js, TypeScript, Prisma, PostgreSQL, pnpm, Vitest, Playwright, Tailwind, Docker Compose, and GitHub Actions stack
- Keep shipped `v0.4.0` runtime truth separate from future `v0.5.0` contract truth
- Keep `CommitmentPolicy` bounded to the fixed `v0.5.0` contract instead of widening into a generic builder
- Keep `ExceptionCase` as the only current branch-head exception source of truth now that Phase 2 exists
- Keep manager risk metadata derived from active `ExceptionCase` rows instead of inventing a parallel alert truth
- Keep notifications, email, and any other delivery as derived outputs from the case ledger
- Keep outbound delivery bounded to one derived email channel in the current branch head
- Prefer auto-resolve for cleared conditions and keep manual resolve as supporting operator control
- Keep hosted-CI claims tied to actual pushed refs; do not claim GitHub-hosted validation for unpushed local state
