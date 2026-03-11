# SPEC

## Product

- Project name: `ops-tracker`
- Package name prefix: `@ops-tracker/*`
- Docker Compose project name: `ops-tracker`
- Environment variable prefix: `OPS_TRACKER_`

## Goal

`ops-tracker` is an authenticated operations tracking web app for small and midsize teams. Reviewers can sign in with a seeded account, create and manage projects and tasks, move tasks across statuses, and confirm the core workflow in under five minutes.

## Target users

- Team leads managing active client or internal delivery work
- Coordinators who update task state from a desktop browser
- Reviewers who need a seeded, repeatable local demo flow

## Core entities

- User
- Project
- Task
- Session

## Core use cases

1. Sign in with a seeded account and land on a protected dashboard.
2. Create, search, view, edit, and archive projects.
3. Create, search, view, edit, delete, and transition tasks inside projects.
4. Complete the list -> detail -> update -> status transition -> refreshed list flow without leaving the browser.

## Functional requirements

- Email/password authentication with server-enforced protected routes
- Dashboard with summary metrics and recent work
- Project CRUD with search and status filter
- Task CRUD with validation, search, status filter, and project relation
- Seeded demo data for:
  - a normal populated state
  - an empty state via a project with no tasks
  - validation errors via form submissions
- Loading, empty, error, and success states in core screens
- Desktop-first responsive UI that remains usable on mobile

## Non-goals

- Billing or payment flows
- External ERP integrations
- Multi-tenant org management beyond a single seeded team

## Technical decisions

- Stack: TypeScript, Next.js App Router, React, Tailwind CSS, PostgreSQL, Prisma, pnpm, Docker Compose, Vitest, Playwright
- Backend surface: Next.js Route Handlers and Server Actions
- Auth: custom session cookie backed by database sessions
- Deployment target for local review: Dockerized Postgres plus local Next.js app

## Acceptance criteria

- `pnpm install`
- `docker compose up -d`
- `pnpm exec prisma generate`
- `pnpm exec prisma migrate deploy || pnpm exec prisma migrate dev`
- `pnpm db:seed`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm build`

All commands above complete successfully after copying `.env.example` to `.env`.
