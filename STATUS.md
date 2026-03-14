# STATUS

## Current state

- Current shipped release is `v0.4.0`
- `package.json` remains `0.4.0` on the current branch head
- The current repo runtime extends the shipped `ops-tracker v0.4.0` baseline with `v0.5.0 Phase 1` commitment policy work, `Phase 2` exception ledger work, and `Phase 3` response workflow work
- `ops-tracker v0.5.0 Phase 4 — Release Closeout` is now complete on the current local branch head
- Canonical shipped contract doc: `docs/contracts/v0.4.0-operating-contract.md`
- Canonical `v0.5.0` contract doc: `docs/contracts/v0.5.0-commitment-contract.md`
- Canonical forward handoff doc: `docs/handoffs/v0.4.0-to-v0.5.0.md`
- Canonical next-line handoff doc: `docs/handoffs/v0.5.0-to-v0.6.0.md`
- `CommitmentPolicy` now exists in Prisma schema, the checked-in Phase 1 migration, seed data, validation, and manager-console UI
- `v0.5.0` risk evaluation now covers `OVERDUE`, `REVIEW_STALE`, `BLOCKED_STALE`, `UNASSIGNED_STALE`, and `RECURRING_FAILED`
- `ExceptionCase` now exists in Prisma schema, the checked-in Phase 2 migration, runtime reconciliation, response actions, seed sync, and manager queue UI
- dashboard, task queues, recurring template views, and `/exceptions` now expose exception-ledger-backed risk metadata from active open cases
- `/commitments` now provides the bounded admin and manager UI for listing, creating, and editing policies
- `/exceptions` now provides the manager queue for actionable and snoozed exception work objects plus response controls
- `ExceptionEmailDelivery` now records one derived outbound email channel for critical opens and owner assignment
- `v0.5.0` delivery remains a derived concern from `ExceptionCase`, not a parallel source of truth
- workspace membership role controls now label each role selector with `name + email`, so duplicate display names do not break manager delegation flows
- the Playwright app spec now reseeds the canonical demo baseline before each test, so the historical compatibility sweep no longer depends on shared database state
- `v0.5.0` is release-ready locally, but it is not shipped yet and has no hosted CI run of its own until the current tree is committed and pushed
- The latest observed hosted GitHub Actions run is `ci` run `#25` on March 12, 2026 for `origin/main` commit `2afe999a47fa29133897d736240922a144e66f3d`, and both `validate` and `e2e` succeeded

## v0.5.0 Phase 4 completed

- `[done]` reconciled repo docs, release notes, contracts, and handoffs to one `v0.5.0` release-ready boundary
- `[done]` created `RELEASE_NOTES_v0.5.0.md`
- `[done]` created `docs/handoffs/v0.5.0-to-v0.6.0.md`
- `[done]` recorded the exact local validation suite for the current `v0.5.0` tree
- `[done]` observed the latest hosted GitHub Actions result on `origin/main` and fixed the exact blocker for the unpushed local `v0.5.0` tree
- `[done]` fixed the exact next human steps for PR, merge, tag, and GitHub Release

## Locked decisions

- `v0.5.0` theme: `Operational commitments become actionable exceptions`
- `v0.5.0` subtheme: `Problems stop being alerts and start becoming work`
- `CommitmentPolicy` is the official `v0.5.0` commitment model
- `CommitmentPolicy.scopeType` is fixed to `WORKSPACE`, `PROJECT`, and `TEMPLATE`
- `CommitmentPolicy.kind` is fixed to `OVERDUE`, `REVIEW_STALE`, `BLOCKED_STALE`, `UNASSIGNED_STALE`, and `RECURRING_FAILED`
- `CommitmentPolicy` thresholds are bounded to `thresholdMinutes` or `thresholdHours`; `v0.5.0` is not a generic rule builder
- `CommitmentPolicy.severity` is fixed to `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL`
- `ExceptionCase` is the `v0.5.0` source-of-truth exception ledger and work object
- `ExceptionCase.status` is fixed to `OPEN`, `ACKNOWLEDGED`, `SNOOZED`, and `RESOLVED`
- `ExceptionCase.resolutionKind` is fixed to `AUTO` and `MANUAL`
- same source, same kind, and same policy converge to one open case through a stable `fingerprint`
- manager surfaces now rebuild risk metadata from active `ExceptionCase` rows instead of direct policy hits
- `/exceptions` is the current bounded response queue for actionable and snoozed exception work
- notifications, inbox rows, and outbound email remain derived outputs from `ExceptionCase`
- outbound delivery is currently bounded to one derived email channel through `ExceptionEmailDelivery`
- auto-resolve is preferred when the underlying condition clears; manual resolve is supplementary
- `v0.5.0` is not a full incident platform, policy builder UI, full multi-channel delivery matrix, advanced SLA prediction, org hierarchy, BI or forecasting product, or arbitrary custom rule engine
- `v0.5.0` implementation order is fixed to `Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4`

## Next step

1. Commit the current `v0.5.0` release-ready tree, including the closeout docs and release notes.
2. Push that commit on a review branch and wait for hosted `ci` to run on the exact `v0.5.0` tree.
3. Open a PR to `main` and use `RELEASE_NOTES_v0.5.0.md` plus `docs/handoffs/v0.4.0-to-v0.5.0.md` as the release summary.
4. Bump `package.json` from `0.4.0` to `0.5.0` before merge or as part of the release commit.
5. Merge the PR after hosted `validate` and `e2e` are green.
6. Tag the merge commit as `v0.5.0`, publish the GitHub Release from `RELEASE_NOTES_v0.5.0.md`, and only then start `v0.6.0 Phase 0 — Contract`.

## Known issues

- [blocked] the exact current local `v0.5.0` release-ready tree has not been committed and pushed, so GitHub-hosted CI cannot yet observe this exact tree
- [follow-up] `UNASSIGNED_STALE` currently measures from task `createdAt` because a dedicated unassigned-since timestamp does not exist yet
- [follow-up] only one derived outbound email channel exists today; multi-channel delivery, digesting, and advanced escalation remain deferred to `v0.6.0+`
- [follow-up] this local database originally had Phase 2 and Phase 3 applied via direct SQL without matching `_prisma_migrations` records; the history has now been reconciled with `prisma migrate resolve --applied`

## Exact run commands

- `corepack pnpm exec prisma generate`
  - passed
- `docker compose up -d`
  - passed
- `docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U ops_tracker -d ops_tracker < prisma/migrations/20260314223000_v0_5_0_phase_3_response_and_escalation/migration.sql`
  - passed
- `/bin/zsh -lc 'set -a; source .env.example; set +a; corepack pnpm exec prisma migrate resolve --applied 20260314193000_v0_5_0_phase_2_exception_ledger'`
  - passed
- `/bin/zsh -lc 'set -a; source .env.example; set +a; corepack pnpm exec prisma migrate resolve --applied 20260314223000_v0_5_0_phase_3_response_and_escalation'`
  - passed
- `node --env-file=.env.example --import tsx prisma/seed.ts`
  - passed
- `corepack pnpm lint`
  - passed
- `corepack pnpm typecheck`
  - passed
- `corepack pnpm exec vitest run tests/unit/commitment-policies.test.ts tests/unit/validation.test.ts tests/unit/task-views.test.ts tests/unit/manager-console.test.ts tests/unit/exception-cases.test.ts tests/unit/exception-response.test.ts`
  - passed
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts --grep "manager can open the exception queue and drill into the source task|manager can acknowledge, assign, snooze, and track derived email on an exception"`
  - passed
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts --grep "team can execute the v0.2.0 collaboration flow end-to-end|admin can clear risky queues with the M3.2 bulk manager console flow|admin can turn repeat work into templates and manual recurring generation|manager can inspect scheduled execution history and rerun a failed scheduled slot|admin can safely delegate the manager console to a manager role"`
  - passed
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts`
  - passed (`8 passed`)
- `corepack pnpm test`
  - passed (`17/17` files, `92/92` tests)
- `corepack pnpm test:e2e`
  - passed (`8 passed`)
- `corepack pnpm build`
  - passed
- `cp .env.example .env && corepack pnpm recurring:tick`
  - passed (`Due: 2 Succeeded: 1 Failed: 0 Skipped: 1`)
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts --grep "team can execute the v0.2.0 collaboration flow end-to-end"`
  - passed
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts --grep "admin can clear risky queues with the M3.2 bulk manager console flow"`
  - passed
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts --grep "admin can safely delegate the manager console to a manager role"`
  - passed
- `corepack pnpm exec playwright test tests/e2e/app.spec.ts --grep "manager can open the exception queue and drill into the source task|manager can acknowledge, assign, snooze, and track derived email on an exception"`
  - passed
- `curl -s 'https://api.github.com/repos/cvren/ops-tracker/actions/runs?per_page=5'`
  - observed run `#25` for `origin/main` commit `2afe999a47fa29133897d736240922a144e66f3d` on March 12, 2026 with `conclusion=success`
- `curl -s -H 'Accept: application/vnd.github+json' 'https://api.github.com/repos/cvren/ops-tracker/commits/2afe999a47fa29133897d736240922a144e66f3d/check-runs'`
  - observed `validate=success` and `e2e=success` for the same run
- `/bin/zsh -lc 'set -a; source .env.example; set +a; corepack pnpm exec prisma migrate deploy'`
  - passed
- `git diff --check`
  - passed
