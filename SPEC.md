# SPEC

## Product

- Project name: `ops-tracker`
- Version target: `v0.3.0`
- Current implementation target: `M3 final reconciliation + release-ready closeout`
- Package name prefix: `@ops-tracker/*`
- Docker Compose project name: `ops-tracker`
- Environment variable prefix: `OPS_TRACKER_`

## Release-ready objective

`ops-tracker` `v0.3.0` must be fixed to the current branch-head truth without adding new scope.

Release-ready closeout is complete only when the following are true:

1. The shipped `v0.3.0` scope is stable and matches the repository implementation.
2. Local validation truth is measured and recorded without polluting the normal developer workflow with sandbox-only workarounds.
3. `README.md`, `PLAN.md`, `STATUS.md`, `RELEASE_NOTES_v0.3.0.md`, and `docs/handoffs/v0.3.0-to-m4.md` all describe the same shipped boundary.
4. Current branch-head GitHub-hosted CI is observed as success, or the exact blocker is recorded.
5. Exact next human steps for PR, merge, tag, and release are clear.

## Shipped scope in v0.3.0

- `v0.2.0` collaboration foundation:
  - workspace and membership boundary
  - task owner, reviewer, due date, blocked state, and review lifecycle
  - comments, mentions, activity timeline, and inbox
- `M3.1` manager dashboard:
  - overdue, review, blocked, unassigned, due-soon, aging, workload, and bottleneck views
  - drill-down routes through `/tasks`
- `M3.2` manager bulk actions:
  - admin-only task multi-select on manager queues
  - all-or-nothing bulk owner, reviewer, due date, status, blocked state, and priority updates
  - `TASK_BULK_UPDATED` activity trace
- `M3.3` repeat-work controls:
  - admin-only task templates
  - admin-only recurring schedules
  - manual `Generate now`
  - duplicate-resistant recurring execution per schedule run slot
  - template and recurring activity trace

## Core entities in v0.3.0

- User
- Workspace
- Membership
- Project
- Task
- Comment
- CommentMention
- ActivityEvent
- Notification
- Session
- TaskTemplate
- RecurringSchedule
- RecurringExecution

## Non-goals for this closeout

- No new product scope for M4
- No background cron, queue, or worker system
- No analytics or reporting expansion
- No member-safe manager permission redesign
- No notification fan-out expansion
- No project-wide refactor

## Technical constraints

- Keep the existing Next.js, TypeScript, Prisma, PostgreSQL, pnpm, Vitest, Playwright, Tailwind, Docker Compose, and GitHub Actions stack
- Keep `Membership.role` as the effective authorization boundary
- Keep the product single-workspace in `v0.3.0`
- Keep manager-console mutations admin-only in `v0.3.0`
- Keep recurring execution manual in `v0.3.0`
- Keep `test:e2e` and `build` serial in the same worktree because both touch `.next`

## Deliverables for release-ready closeout

- Reconciled docs that match the current repository truth
- Release-ready `RELEASE_NOTES_v0.3.0.md`
- Updated `docs/handoffs/v0.3.0-to-m4.md`
- Exact validation results for local commands
- Observed hosted CI result for the pushed branch head, or an exact blocker
- Exact next human steps for PR, merge, tag, and release

## Done when

- Stale M3 milestone wording and stale numbers are removed from repo docs
- `package.json` stays on version `0.3.0`
- The following commands pass:
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
- Current branch-head GitHub-hosted CI is observed as success, or the exact blocker is recorded

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
```
