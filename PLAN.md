# PLAN

## Milestones

1. Project foundation
   - Completed: repository docs, Next.js scaffold, Prisma schema, Docker Compose, env files, Tailwind, ESLint, Prettier, Vitest, and Playwright
2. Core product implementation
   - Completed: auth, protected routes, dashboard, project CRUD, task CRUD, status transitions, and seed data
3. Verification and polish
   - Completed: unit tests, Playwright reviewer flow, README, and local validation commands

## Current cycle

- Scope: observe `.github/workflows/ci.yml` on a real GitHub-hosted runner, or record the exact blockers if this environment cannot reach that step
- Status: blocked
- Acceptance:
  - `validate` and `e2e` are observed on a GitHub-hosted runner, or
  - the exact missing permissions/tooling are recorded in `STATUS.md` with the next human step
- Validation commands:
  - `git remote -v`
  - `git branch --show-current`
  - `git status --short --branch`
  - `gh auth status`

## Acceptance criteria

- Seeded reviewer can sign in with README instructions only
- Reviewer can create a project, create a task, update the task status, search for the task, and view the updated detail page
- Reviewer can observe empty state, validation error state, and success feedback
- All validation commands from `SPEC.md` pass locally

## Validation commands

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

## Architecture decisions

- Use a single Next.js app to avoid premature service boundaries
- Use Prisma with a PostgreSQL container and committed SQL migrations
- Keep auth state in the database with hashed session tokens
- Favor server components and server actions for data mutations, with small client components only where interaction benefits
- Use a protected task status route handler so the reviewer flow demonstrates UI -> API -> DB for a core state transition
- Use the Next 15 official `FlatCompat` path with `next/core-web-vitals` and `next/typescript` instead of custom manual Next plugin wiring
- Treat `unrs-resolver`'s ignored `postinstall` as an explicit pnpm policy decision, because the repo does not require approving that optional native binding check to pass validation
- Allow the required install scripts for Prisma, esbuild, and sharp through `pnpm.onlyBuiltDependencies` so a fresh clone does not need manual build-script approval
