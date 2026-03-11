# ops-tracker

`ops-tracker` is release-ready for `v0.3.0`: the shipped `v0.2.0` collaboration flow plus the full M3 manager console stack.

## Shipped scope in v0.3.0

- Single `Workspace` + `Membership` collaboration boundary
- Workspace roles: `admin`, `member`, `viewer`
- Task owner, reviewer, due date, blocked reason, priority, and review lifecycle
- Task comments with structured mentions
- Task activity timeline powered by `ActivityEvent`
- In-app inbox powered by `Notification`
- Manager dashboard and drill-down task views from `M3.1`
- Admin-only task multi-select and bulk actions on manager queues
- Admin-only task templates and recurring schedules with manual `Generate now`
- Template and recurring activity trace on task timelines and the templates console

## Deferred to later milestones

- Background recurring execution
- Worker or queue infrastructure
- Template versioning and cross-workspace templates
- Member-facing repeat-work permissions beyond admins
- Notification fan-out for recurring execution

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
- Operator: `operator@ops-tracker.local` / `ChangeMe123!`
- Reviewer: `reviewer@ops-tracker.local` / `ChangeMe123!`

## v0.3.0 demo flow

1. Sign in as the admin and open `/dashboard`.
2. Open `Unassigned`, multi-select the queue, and bulk assign an owner.
3. Return to the dashboard, open `Overdue`, and bulk move due dates for the blocked overdue tasks.
4. Return to the dashboard, open `Blocked Aging`, and bulk unblock the queue.
5. Open `Templates` from the dashboard header or nav.
6. Create a task template, then generate one task from that template into a project.
7. Create a recurring schedule from the same template and click `Generate now`.
8. Open the generated task and confirm `Created from template` and `Recurring schedule executed` appear in the timeline.
9. Return to `Templates` or `Due This Week` to confirm the generated work is visible in the manager console.

## Validation commands

Run these commands serially:

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
