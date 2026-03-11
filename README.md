# ops-tracker

`ops-tracker` `v0.2.0 Milestone 2` is an authenticated operations tracker for shared ownership, review handoff, task comments, activity trace, and inbox notifications. This milestone builds on the M1 foundation instead of replacing it.

## Milestone 2 scope

- Single `Workspace` + `Membership` collaboration boundary
- Workspace roles: `admin`, `member`, `viewer`
- Task owner, reviewer, due date, blocked reason, and review lifecycle
- Task comments with structured mentions
- Task activity timeline powered by `ActivityEvent`
- In-app inbox powered by `Notification`
- Saved views: `My Tasks`, `Needs Review`, `Overdue`, `Unassigned`

## Deferred to Milestone 3

- Email notifications
- Slack notifications
- Real-time updates
- Attachment support
- Comment edit/delete/threading
- Advanced notification preferences and bulk actions
- Analytics, SLA, webhook, and automation features

## Stack

- TypeScript
- Next.js App Router + React + Tailwind CSS
- PostgreSQL + Prisma
- Docker Compose + pnpm
- Vitest + Playwright

## Prerequisites

- Node.js 22 or newer
- Corepack-enabled `pnpm@10.7.0`
- Docker Desktop or a compatible Docker Engine

## Quick start

1. Copy the environment file.

```bash
cp .env.example .env
```

2. Install dependencies.

```bash
corepack pnpm install
```

3. Start PostgreSQL.

```bash
docker compose up -d
```

4. Generate Prisma Client and apply migrations.

```bash
corepack pnpm exec prisma generate
corepack pnpm exec prisma migrate deploy || corepack pnpm exec prisma migrate dev
```

5. Seed the M2 demo workspace.

```bash
corepack pnpm db:seed
```

6. Start the app.

```bash
corepack pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

- Admin: `admin@ops-tracker.local` / `ChangeMe123!`
- Operator: `operator@ops-tracker.local` / `ChangeMe123!`
- Reviewer: `reviewer@ops-tracker.local` / `ChangeMe123!`

## Five-minute M2 demo

1. Sign in as the admin account.
2. Open `Dashboard` and `Workspace` to verify the saved views and membership roster.
3. Create a project and a task with an owner, reviewer, and due date.
4. Sign in as the operator, open `My Tasks`, start work, add a comment, mention the reviewer, and request review.
5. Sign in as the reviewer, open `Inbox`, verify unread notifications, mark them read, then open `Needs Review`.
6. Open the task detail, inspect the comment and timeline, and send `Changes requested`.
7. Sign in as the operator, confirm the inbox update, add another comment with a mention, and request review again.
8. Sign in as the reviewer, open the inbox item back to the task, inspect the updated timeline, and approve the task.
9. Sign in as the operator, confirm the approval notification in `Inbox`, then verify `Overdue` and `Unassigned` still surface seeded risk items.

## Environment variables

Required values are documented in `.env.example`:

- `DATABASE_URL`
- `OPS_TRACKER_SESSION_COOKIE`
- `OPS_TRACKER_SESSION_SECRET`
- `OPS_TRACKER_DEMO_EMAIL`
- `OPS_TRACKER_DEMO_PASSWORD`
- `OPS_TRACKER_SECONDARY_EMAIL`
- `OPS_TRACKER_SECONDARY_PASSWORD`
- `OPS_TRACKER_TERTIARY_EMAIL`
- `OPS_TRACKER_TERTIARY_PASSWORD`

## Validation commands

Run these commands serially:

- Do not overlap `corepack pnpm test:e2e` and `corepack pnpm build` in the same working tree; both rely on `.next` artifacts.

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

## E2E prerequisites

`corepack pnpm test:e2e` assumes:

- PostgreSQL is running on `127.0.0.1:5434`
- `.env` exists and matches `.env.example`
- Prisma generate and migrate already completed
- `corepack pnpm db:seed` already completed

Playwright starts its own Next.js dev server on port `3100`.

## CI

GitHub Actions runs the same serial validation path in `.github/workflows/ci.yml`.

## API surface

- `GET /api/health`
- `GET /api/projects`
- `GET /api/tasks`
- `PATCH /api/tasks/:taskId/status`

All API routes require authentication except `GET /api/health`.
