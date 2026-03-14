# ops-tracker

`ops-tracker` has shipped `v0.4.0`: the existing collaboration flow plus the full `v0.4.0` manager delegation and recurring execution baseline. The current local branch head now closes out `v0.5.0` through `Phase 4 — Release Closeout`, fixing the release-ready boundary in repo docs, validation notes, and handoffs while keeping the shipped release at `v0.4.0` until PR, merge, tag, and GitHub Release steps are completed.

See `docs/contracts/v0.4.0-operating-contract.md` for the shipped `v0.4.0` contract baseline, `docs/contracts/v0.5.0-commitment-contract.md` for the locked `v0.5.0` contract, `docs/handoffs/v0.3.0-to-v0.4.0.md` for the shipped release handoff, `docs/handoffs/v0.4.0-to-v0.5.0.md` for the `v0.5.0` closeout handoff, and `docs/handoffs/v0.5.0-to-v0.6.0.md` for the next-line handoff.

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

## v0.5.0 release-ready baseline

- Theme: `Operational commitments become actionable exceptions`
- Subtheme: `Problems stop being alerts and start becoming work`
- Canonical contract: `docs/contracts/v0.5.0-commitment-contract.md`
- `Phase 1` adds the bounded `CommitmentPolicy` model, manager-console policy UI, and fixed-kind evaluation
- `Phase 2` adds the `ExceptionCase` source-of-truth ledger, deduped open-case creation, auto-resolve, and the `/exceptions` manager queue
- `Phase 3` adds acknowledge, snooze, assignment, manual resolve, and one derived outbound email channel without widening into a multi-channel platform
- `Phase 4` aligns docs, validation truth, release notes, handoffs, and release-ready next steps without widening product scope

## v0.5.0 Phase 1 demo flow

1. Start from a fresh seed and sign in as `admin@ops-tracker.local`.
2. Open `/commitments` and confirm the seeded policy ledger shows workspace, project, and template-scoped commitment policies.
3. Create a new `REVIEW_STALE` policy scoped to `OPS-ALPHA · Harbor inventory rollout` with a `30 minutes` threshold.
4. Open `/tasks?view=review-queue` and confirm `Prepare dock handoff checklist` now shows a risk card with `Source: <policy name>`.
5. Return to `/commitments`, edit that same policy to `6 hours`, and save it.
6. Reopen `/tasks?view=review-queue` and confirm the same risk source disappears because the task no longer breaches the edited threshold.

## v0.5.0 Phase 2 demo flow

1. Start from a fresh seed and sign in as `manager@ops-tracker.local`.
2. Open `/exceptions` and confirm the queue shows open cases such as `Overdue: Close scanner parity gap for west dock`.
3. Confirm the queue cards show severity, status, source policy, opened time, and a source link.
4. Open `Overdue: Close scanner parity gap for west dock` and follow `Open task · OPS-ALPHA`.
5. Confirm the task detail opens for `Close scanner parity gap for west dock`.
6. Return to `/commitments`, create or edit a policy threshold so a currently open breach clears.
7. Reopen `/exceptions` or the affected queue and confirm the case disappears automatically once the underlying condition no longer matches.

## v0.5.0 Phase 3 demo flow

1. Start from a fresh seed and sign in as `manager@ops-tracker.local`.
2. Open `/exceptions` and find `Blocked stale: Resolve carrier API dependency`.
3. Click `Acknowledge` and confirm the case moves into an acknowledged response state.
4. Assign the case to `Ken Operator` and confirm the card now shows `Owner: Ken Operator`.
5. Confirm the same card shows a derived email entry with subject `[Ops Tracker] Exception assigned · OPS-BETA`.
6. Set the snooze window to `24 hours`, click `Snooze`, and confirm the case moves into the `Snoozed cases` section.
7. Use `Resolve manually` on another active case if needed; if the underlying source still violates its policy, the ledger may open a fresh case on a later refresh.

## Current release state

- Current shipped release: `v0.4.0`
- Current package version: `0.4.0`
- Published release notes: `RELEASE_NOTES_v0.4.0.md`
- Draft release notes for the next cut: `RELEASE_NOTES_v0.5.0.md`
- Canonical `v0.5.0` contract: `docs/contracts/v0.5.0-commitment-contract.md`
- Current local branch-head implementation target completed: `ops-tracker v0.5.0 Phase 4 — Release Closeout`
- Current hosted GitHub Actions observation on `origin/main` is run `#25` for commit `2afe999a47fa29133897d736240922a144e66f3d` on March 12, 2026, and it completed `success` with `validate` and `e2e`
- Current local `v0.5.0` working tree still has no hosted CI of its own because the release-ready tree has not been committed and pushed yet
- Next implementation target after release: `ops-tracker v0.6.0 Phase 0 — Contract`

## v0.5.0 release-ready next steps

1. Commit the current `v0.5.0` Phase 1 through Phase 4 tree on a pushable branch and include the release-closeout docs.
2. Push that branch to GitHub and wait for hosted `ci` to run on the actual `v0.5.0` tree.
3. Open a PR against `main` using `docs/handoffs/v0.4.0-to-v0.5.0.md` and `RELEASE_NOTES_v0.5.0.md` as the review and release summary.
4. Before merge or as part of the release commit, bump `package.json` from `0.4.0` to `0.5.0` so the repo version matches the release tag.
5. Merge the PR after hosted `validate` and `e2e` are green on the pushed `v0.5.0` tree.
6. Tag the merge commit as `v0.5.0` and create the GitHub Release from `RELEASE_NOTES_v0.5.0.md`.
