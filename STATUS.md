# STATUS

## Current state

- `ops-tracker` is fully scaffolded and implemented
- Auth, dashboard, project CRUD, task CRUD, search, and status transitions are working
- Validation has been rerun serially as the current execution source of truth
- `AGENTS.md` now exists in-repo, and Playwright no longer depends on an absolute workspace path
- The Next.js build warning is resolved through the official Next 15 ESLint compatibility path, with no narrower workaround applied
- Final hardening is complete, including pnpm install policy, clean-worktree setup audit, and CI automation
- The GitHub Actions workflow has been statically audited against the current repo state and minimally hardened with explicit permissions, timeouts, and failure artifacts

## Decisions

- Build a single-app authenticated operations tracker
- Core entities are `Project` and `Task`
- Use custom session auth backed by Prisma `Session`
- Use a protected route handler for task status updates and server actions for form-driven mutations

## Known issues

- `[blocked]` GitHub-hosted runner execution for `.github/workflows/ci.yml` could not be started from this environment. Observed blockers in this turn: `git remote -v` returned no configured remote, `gh` is not installed (`gh auth status` failed with `command not found`), and the repository is still `No commits yet on main`. Static audit of the workflow remains positive, but there is no path from this workspace to push a branch or trigger Actions on GitHub.

## Exact run commands

```bash
cp .env.example .env
pnpm install
docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate deploy || pnpm exec prisma migrate dev
pnpm db:seed
pnpm dev
```

Optional one-command local start after `.env` exists:

```bash
pnpm dev:stack
```

Verified validation commands:

```bash
pnpm install
docker compose up -d
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Latest cycle revalidation:

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

Measured results:

- `pnpm install`: passed with no ignored-build-script notice
- `docker compose up -d`: passed
- `pnpm exec prisma generate`: passed
- `pnpm exec prisma migrate deploy`: passed with no pending migrations
- `pnpm db:seed`: passed
- `pnpm lint`: passed
- `pnpm typecheck`: passed
- `pnpm test`: passed
- `pnpm test:e2e`: passed
- `pnpm build`: passed with no Next.js ESLint warning

Fresh-worktree audit:

- removed `/tmp/ops-tracker-clean/node_modules` and reran `pnpm install`
- fresh install passed with no ignored-build-script notice
- current worktree also passed with no ignored-build-script notice after `pnpm rebuild @prisma/client @prisma/engines esbuild prisma sharp`

Workflow static audit:

- Node is fixed to major version `22` in `actions/setup-node`, matching the repo's `engines.node >=22`
- `pnpm` is fixed to `10.7.0` via `pnpm/action-setup`
- pnpm cache is enabled through `actions/setup-node`
- PostgreSQL is declared as a GitHub Actions service with health checks and the same port as local docs
- `.env` is generated from `.env.example`, so no GitHub secret is required for this workflow
- command order matches the local setup and validation path: install -> generate -> migrate -> seed -> validate/build or e2e
- the e2e job installs Chromium explicitly and relies on Playwright's `webServer` to boot Next.js on port `3100`
- `build` and `test:e2e` are isolated in separate sequential jobs, matching the repo's serial-run constraint
- workflow hardening added explicit `contents: read` permissions, job timeouts, and failure artifact upload for `playwright-report` plus `test-results`

GitHub execution blockers observed in this turn:

- `git remote -v`: no configured remote
- `git branch --show-current`: `main`
- `git status --short --branch`: `## No commits yet on main`
- `gh auth status`: unavailable because `gh` is not installed in this environment

Root cause of the former warning:

- Next.js checks the resolved ESLint config for `eslint.config.mjs` / `package.json`
- The repo only registered `@next/next` inside a `files: ["**/*.{ts,tsx}"]` block, so the plugin was visible for app code but not for config-file resolution
- For the installed Next 15.5.12 toolchain, the version-appropriate official fix is `FlatCompat` plus `next/core-web-vitals` and `next/typescript`
- Adopting that official compatibility path made `@next/next` visible to Next.js during `pnpm build`, so no config-shape workaround was needed

Validation note:

- `pnpm build` and `pnpm test:e2e` must be run serially, not in parallel, because both start Next.js processes that contend for the same `.next` workspace
- Inside the Codex sandbox, Prisma and Next.js commands that connect to `127.0.0.1:5434` required escalated execution; this is a local sandbox constraint, not a repository issue
- `pnpm` 10 requires explicit dependency build-script policy. This repo now allows `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma`, and `sharp`, and intentionally ignores `unrs-resolver` because its `postinstall` only checks optional native resolver bindings and validation succeeds without approving it
- If a developer installed dependencies before that policy existed, one `pnpm rebuild @prisma/client @prisma/engines esbuild prisma sharp` clears the stale ignored-build state for the current worktree
- On a fresh install, `@prisma/client` can still print its stock Prisma CLI hint before the explicit `pnpm exec prisma generate` step. That output is expected and does not indicate a missing dependency in this repo
- CI coverage now lives in `.github/workflows/ci.yml` and runs the serial validation path plus a seeded Playwright job; local static audit is complete, but GitHub-hosted execution remains the only unobserved part

## Assumptions

- No existing repo conventions are available, so the default stack from the user specification is the source of truth
- A single-team local demo is sufficient for the initial production-ready baseline

## Next step

- Human step required: create or connect a GitHub repository, commit the current tree, push `main` or a PR branch, and inspect the `validate` and `e2e` workflow runs on GitHub-hosted `ubuntu-latest` runners.
