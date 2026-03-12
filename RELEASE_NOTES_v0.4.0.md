# RELEASE NOTES v0.4.0

`v0.4.0` is release-ready on the current branch head and not shipped yet. The branch head carries `package.json` version `0.4.0`, while the latest shipped release marker remains `v0.3.0` until PR / merge / tag `v0.4.0` / GitHub Release publication complete.

## Included in v0.4.0

### ops-tracker v0.4.0 Phase 0 — Operating Contract

- Fixed the `v0.4.0` theme, role model, execution ledger contract, scheduler entrypoint, phase order, and non-goals in repo docs

### ops-tracker v0.4.0 Phase 1 — Safe Delegation

- Added the workspace-scoped `manager` role to Prisma, runtime permissions, and seed data
- Let admins grant manager access and revoke it back to member from the workspace membership flow
- Delegated dashboard, manager queues, bulk actions, templates, recurring schedules, and manual `Generate now` to admins and managers
- Kept workspace-root settings, membership-wide management, manager re-delegation, and scheduler configuration out of manager scope
- Added activity trace for `MANAGER_ROLE_GRANTED` and `MANAGER_ROLE_REVOKED`
- Added unit and Playwright coverage for admin, manager, member, and viewer boundaries

### ops-tracker v0.4.0 Phase 2 — Execution Ledger

- Migrated `RecurringExecution` to the `v0.4.0 Phase 0` contract shape with workspace, status, timing, trigger provenance, failure detail, and generated-task count
- Changed manual `Generate now` to create a `RUNNING` ledger row first and resolve it to `SUCCESS` or `FAILED`
- Linked generated tasks back to the execution that created them through `Task.recurringExecutionId`
- Added per-schedule execution history UI with `RUNNING`, `SUCCESS`, `FAILED`, and `SKIPPED` visibility
- Added failed execution rerun that creates a fresh execution record for the same slot
- Added recurring execution activity trace for start, success, failure, and rerun
- Added seeded success, failure, skipped, and running execution samples plus automated coverage for history and rerun

### ops-tracker v0.4.0 Phase 3 — Controlled Scheduled Execution

- Added `corepack pnpm recurring:tick` as the official scheduled recurring entrypoint
- Moved scheduled `SYSTEM` execution onto the same recurring execution service already used by manual `Generate now` and rerun
- Added duplicate-safe slot claims with a database partial unique index for `RUNNING`, `SUCCESS`, and `SKIPPED` slot answers
- Added due schedule selection based on `isActive` and `nextRunAt <= now`, while keeping cadence updates on the existing `calculateNextRunAt` helper
- Added scheduled-success demo data plus a rerunnable scheduled-failure sample for seed, tests, and templates UI verification
- Current fresh-seed tick truth is one new `SYSTEM` success plus one skipped due slot; the visible scheduled failure in the demo remains a seeded ledger row until a manager reruns it
- `SKIPPED` remains contract-valid and UI-visible, but the current runtime still treats scheduled skip suppression as tick output rather than a newly created ledger row and does not expose a manager skip action

## Known limits carried forward

- `/workspace` is still read-only for non-admin roles and membership mutation remains admin-only
- `SKIPPED` remains contract-valid and UI-visible, but there is still no manager skip action and tick-suppression skips do not create fresh ledger rows
- Execution history still lives in the templates console and task origin panel; there is no dedicated cross-schedule execution history screen

## Release-ready validation

- Local validation target:
  - `corepack pnpm install`
  - `docker compose up -d`
  - `corepack pnpm exec prisma generate`
  - `corepack pnpm exec prisma migrate deploy || corepack pnpm exec prisma migrate dev`
  - `corepack pnpm db:seed`
  - `corepack pnpm lint`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm test:e2e`
  - `corepack pnpm build`
  - `corepack pnpm recurring:tick`
- Current fresh-seed tick truth:
  - `Due: 2`
  - `Succeeded: 1`
  - `Failed: 0`
  - `Skipped: 1`

## Human release steps

1. Push the release-ready branch head and confirm GitHub-hosted `validate` and `e2e` are green.
2. Open and merge the `v0.4.0` PR into `main`.
3. Create tag `v0.4.0` on the merged commit and push the tag.
4. Publish the GitHub Release using this file as the release body.
