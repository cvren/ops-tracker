# ops-tracker

`ops-tracker` is an authenticated operations tracker for small delivery teams. It lets reviewers sign in with seeded accounts, create and manage projects, capture tasks, move task status through a protected API route, and verify the full list-to-detail workflow in a few minutes.

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

## Features

- Email/password sign-in with database-backed sessions
- Protected dashboard with live project and task metrics
- Project CRUD with search and status filters
- Task CRUD with project assignment, priority, due date, search, and status transitions
- Loading, empty, validation-error, and success states across the main workflow
- Seed data with:
  - populated demo records
  - an intentionally empty project (`OPS-EMPTY`)
  - demo credentials for quick review

## Quick start

1. Copy the environment file.

```bash
cp .env.example .env
```

2. Install dependencies.

```bash
pnpm install
```

`package.json` explicitly marks `unrs-resolver` as an intentionally ignored dependency build script. Its `postinstall` only checks optional native resolver bindings used by ESLint import resolution, and the measured `lint`, `test`, and `build` paths in this repo succeed without approving that script. If `pnpm install` ever reports a different ignored package, treat that as a new audit item rather than approving all scripts blindly.

The repo also explicitly allows the required install scripts for `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma`, and `sharp`, so a fresh `pnpm install` runs those hooks automatically and does not require a manual `pnpm approve-builds` step.

On a fresh install, `@prisma/client` may still print its generic "please install Prisma CLI" postinstall hint. That message is expected here because the package hook runs before the repo's explicit `pnpm exec prisma generate` step; the repo already includes `prisma` as a dev dependency.

If a worktree was installed before this build-script policy existed, `pnpm install` can keep reporting the old ignored state even though the current config is correct. Recovery command:

```bash
pnpm rebuild @prisma/client @prisma/engines esbuild prisma sharp
pnpm install
```

3. Start PostgreSQL.

```bash
docker compose up -d
```

4. Generate Prisma Client and apply migrations.

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy || pnpm exec prisma migrate dev
```

5. Seed demo data.

```bash
pnpm db:seed
```

6. Start the app.

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## One-command local start

After `.env` exists, you can start the full local stack with:

```bash
pnpm dev:stack
```

This brings up PostgreSQL, runs Prisma generate, applies migrations, seeds demo data, and starts Next.js.

## Demo accounts

- Reviewer: `reviewer@ops-tracker.local` / `ChangeMe123!`
- Coordinator: `coordinator@ops-tracker.local` / `ChangeMe123!`

## Five-minute demo flow

1. Sign in with the reviewer account.
2. Open `Projects`.
3. Submit an invalid project once to see validation errors.
4. Create a new project with a unique code such as `OPS-501`.
5. Open the new project and create a task.
6. Open the task detail page, update the title, and move the status to `In progress`.
7. Open `Tasks`, search for the updated title, and confirm the refreshed result.
8. Return to `Projects`, search for `OPS-EMPTY`, open `Documentation refresh`, and confirm the empty state.

In local development, the login page also shows the seeded reviewer credentials. That credential hint is hidden automatically in production builds.

## Environment variables

Required values are documented in `.env.example`:

- `DATABASE_URL`
- `OPS_TRACKER_SESSION_COOKIE`
- `OPS_TRACKER_SESSION_SECRET`
- `OPS_TRACKER_DEMO_EMAIL`
- `OPS_TRACKER_DEMO_PASSWORD`
- `OPS_TRACKER_SECONDARY_EMAIL`
- `OPS_TRACKER_SECONDARY_PASSWORD`

## Validation commands

Run these commands serially. Do not run `pnpm build` and `pnpm test:e2e` in parallel, because both start Next.js processes that contend for the same `.next` workspace.

```bash
pnpm install
docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate deploy || pnpm exec prisma migrate dev
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## E2E prerequisites

`pnpm test:e2e` assumes all of the following are already true:

- PostgreSQL is running on `127.0.0.1:5434`
- `.env` exists and matches `.env.example`
- `pnpm exec prisma generate` has completed
- `pnpm exec prisma migrate deploy || pnpm exec prisma migrate dev` has completed
- `pnpm db:seed` has completed

The Playwright config starts its own Next.js dev server on port `3100`, so keep it serial with `pnpm build`.

## CI

GitHub Actions runs the serial validation path in [.github/workflows/ci.yml](/Users/franny/Documents/New%20project%2010/.github/workflows/ci.yml):

- core validation job: install, Prisma generate, migrate, seed, lint, typecheck, unit test, build
- e2e job: the same DB setup plus Chromium install and `pnpm test:e2e`

Static audit completed for the current repo state:

- `actions/setup-node` pins the runner to Node 22 and caches the pnpm store
- `pnpm/action-setup` pins `pnpm` to `10.7.0`
- PostgreSQL is provided as a GitHub Actions service on `127.0.0.1:5434`
- `.env` is copied from `.env.example`, so no GitHub secrets are required for this local-review workflow
- Prisma generate, migrate, seed, validate, and e2e steps follow the same order as the README
- Playwright installs Chromium explicitly and starts the app through its own `webServer` config, so no separate app boot step is missing
- `build` and `test:e2e` are separated into different sequential jobs, matching the serial execution constraint

GitHub-hosted runner execution is not bundled into local setup. To observe the workflow remotely, this project must be committed into a connected GitHub repository and pushed so GitHub Actions can run the `validate` and `e2e` jobs on `ubuntu-latest`.

## Tests

- `pnpm test`: unit tests for validation and label mapping
- `pnpm test:e2e`: login, validation error, project create, task create, task update, status transition, search, and empty state

## API surface

- `GET /api/health`
- `GET /api/projects`
- `GET /api/tasks`
- `PATCH /api/tasks/:taskId/status`

All API routes require authentication except `GET /api/health`.
