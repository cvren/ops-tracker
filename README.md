# ops-tracker

`ops-tracker` has shipped `v0.4.0`: the existing collaboration flow plus the full `v0.4.0` manager delegation and recurring execution baseline. The next development handoff starts at `docs/handoffs/v0.4.0-to-v0.5.0.md`.

See `docs/contracts/v0.4.0-operating-contract.md` for the `v0.4.0` contract baseline, `docs/handoffs/v0.3.0-to-v0.4.0.md` for the shipped release handoff, and `docs/handoffs/v0.4.0-to-v0.5.0.md` for the next line of work.

## Foundation retained from v0.3.0

- Single `Workspace` + `Membership` collaboration boundary
- Workspace roles in the shipped release: `admin`, `member`, `viewer`
- Task owner, reviewer, due date, blocked reason, priority, and review lifecycle
- Task comments with structured mentions
- Task activity timeline powered by `ActivityEvent`
- In-app inbox powered by `Notification`
- Manager dashboard and drill-down task views shipped in `v0.3.0`
- Admin-only task multi-select and bulk actions on manager queues
- Admin-only task templates and recurring schedules with manual `Generate now`
- Template and recurring activity trace on task timelines and the templates console

## Shipped scope in v0.4.0

- Workspace roles in the current repo runtime: `admin`, `manager`, `member`, `viewer`
- Admin-managed role assignment for promoting a workspace member to `manager` and demoting a manager back to `member`
- Shared manager console access for `admin` and `manager`
- Manager access to dashboard, manager queues, bulk actions, templates, recurring schedules, and manual `Generate now`
- `member` collaboration flow preserved for normal task, review, comment, and update work
- `viewer` remains read-only
- Activity trace for `MANAGER_ROLE_GRANTED` and `MANAGER_ROLE_REVOKED`
- `RecurringExecution` now acts as the recurring execution ledger for manual runs, scheduled runs, and reruns
- Templates now show execution history with `RUNNING`, `SUCCESS`, `FAILED`, and `SKIPPED` visibility for both `USER` and `SYSTEM` triggers
- Generated tasks now show their execution origin and link back to the schedule history
- Failed executions can be rerun by managers, and rerun creates a new execution record
- `corepack pnpm recurring:tick` now runs active due schedules through the same recurring pipeline as manual `Generate now`
- Duplicate-safe slot claims are enforced for `RUNNING`, `SUCCESS`, and `SKIPPED` answers on the same schedule slot
- Fresh-seed scheduled truth is: `recurring:tick` creates one new `SYSTEM` success for `Scheduled inventory digest`, reports one skipped due slot for `Recovery retry drill`, and leaves the seeded failed row visible for rerun
- `SKIPPED` remains part of the contract and seeded UI history, but the current runtime does not expose a manager skip action and tick suppression does not create a fresh skip ledger row
- Current validation baseline covers install, migrations, seed, lint, typecheck, unit tests, Playwright e2e, build, and `recurring:tick`
- GitHub-hosted `ci` has been observed green for the shipped `v0.4.0` release line with both `validate` and `e2e` succeeding

## Quick start

```bash
cp .env.example .env
corepack pnpm install
docker compose up -d
corepack pnpm exec prisma generate
corepack pnpm exec prisma migrate deploy || corepack pnpm exec prisma migrate dev
corepack pnpm db:seed
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

- Admin: `admin@ops-tracker.local` / `ChangeMe123!`
- Manager: `manager@ops-tracker.local` / `ChangeMe123!`
- Operator: `operator@ops-tracker.local` / `ChangeMe123!`
- Reviewer: `reviewer@ops-tracker.local` / `ChangeMe123!`
- Viewer: `viewer@ops-tracker.local` / `ChangeMe123!`

## v0.4.0 demo flow

1. Start from a fresh seed, sign in as `manager@ops-tracker.local`, and open `/templates`.
2. Run `corepack pnpm recurring:tick` from the repo root.
3. Return to `/templates` and open the `Scheduled inventory digest` schedule.
4. Confirm a new `SUCCESS` execution row appears with `Triggered by System` and a generated-task count of `1`.
5. Open the generated task and confirm the task page shows an `Execution origin` panel that links back to the schedule history.
6. Return to `/templates` and open the `Recovery retry drill` schedule.
7. Confirm the seeded `FAILED` execution row is still visible with `Triggered by System` and a readable failure reason.
8. Note that the fresh-seed tick outcome is `Due: 2`, `Succeeded: 1`, `Failed: 0`, `Skipped: 1`; `Recovery retry drill` is skipped because that failed slot already exists and must be recovered via rerun.
9. Click `Rerun failed slot` and confirm a new execution row is added instead of mutating the failed one.
10. Open the rerun-generated task and confirm it links back to the new execution.
11. Optionally sign in as `viewer@ops-tracker.local` to confirm the recurring console remains read-only for viewers.

## Validation commands

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

## Current release state

- Current shipped release: `v0.4.0`
- Current package version: `0.4.0`
- Published release notes: `RELEASE_NOTES_v0.4.0.md`
- Next line of work: `docs/handoffs/v0.4.0-to-v0.5.0.md`
