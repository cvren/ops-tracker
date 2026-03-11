# STATUS

## Current state

- `ops-tracker` has shipped the full `v0.3.0` feature boundary locally
- The current task is release-ready reconciliation only; no new product scope is being added
- Current branch name: `codex/v0.3-m3`
- Current local HEAD before closeout commit/push: `2dbed119ec971d38ef19704a035963e93969d292`

## Release-ready reconciliation audit

- `[done]` `package.json` is on version `0.3.0`
- `[done]` Local validation truth has been measured from the current repository state
- `[done]` The shipped M3 boundary is present in code: dashboard drill-down, manager bulk actions, templates, recurring schedules, and manual generation
- `[partial]` Repo docs still need to be normalized from milestone-implementation wording to release-ready wording
- `[stale-doc]` Some durable docs still describe `M3.3` as the active phase instead of `v0.3.0` release closeout
- `[unverified]` Current branch-head GitHub-hosted `ci` has not yet been observed

## Next step

- Normalize the remaining docs, commit the reconciled branch state, push `codex/v0.3-m3`, then observe the hosted `validate` and `e2e` jobs on that pushed head

## Decisions

- No new scope is allowed during this closeout; only reconciliation, validation, and release-readiness work is in bounds
- Sandbox-specific caveats stay in `STATUS.md` unless they represent a real repository defect in a normal developer environment
- Admin-only manager-console permissions remain part of the shipped `v0.3.0` boundary and are not widened here
- Recurring execution remains manual in `v0.3.0`; M4 may build on it, but this closeout does not

## Known issues

- `[unverified]` The local branch has no upstream configured yet, so current-head hosted CI cannot be observed until the reconciled branch state is pushed
- `[follow-up]` In this sandbox, `corepack pnpm db:seed` is equivalent to `set -a; source .env; set +a; node --import tsx prisma/seed.ts` because `tsx` IPC pipes are restricted
- `[follow-up]` `corepack pnpm install` completed successfully from the lockfile but emitted an npm registry metadata warning because outbound network resolution is restricted in this sandbox

## Exact run commands

- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm install`
  - passed, with an npm registry metadata warning before the install completed
- `docker compose up -d`
  - passed
- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm exec prisma generate`
  - passed
- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm exec prisma migrate deploy`
  - passed after fixing `20260311201500_v0_3_0_repeat_work_authorship` and rerunning `prisma migrate resolve --rolled-back 20260311201500_v0_3_0_repeat_work_authorship`
- `set -a; source .env; set +a; node --import tsx prisma/seed.ts`
  - passed
- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm lint`
  - passed
- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm typecheck`
  - passed
- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm test`
  - passed, `12` files / `65` tests
- `env COREPACK_HOME=/Users/franny/.codex/worktrees/0bbc/New\ project\ 10/.local/corepack corepack pnpm test:e2e`
  - passed, `3` Playwright specs
- `env COREPACK_HOME='/Users/franny/.codex/worktrees/0bbc/New project 10/.local/corepack' corepack pnpm build`
  - passed

## v0.3.0 demo

1. Sign in as `admin@ops-tracker.local / ChangeMe123!`
2. Review dashboard risk cards and drill into the manager queues
3. Bulk-triage unassigned, overdue, or blocked work from `/tasks`
4. Open `/templates`
5. Create a template, generate a one-off task, create a recurring schedule, and click `Generate now`
6. Open the generated task and confirm the activity timeline entries

## Deferred items for M4

- Background cron execution
- Queue or worker infrastructure
- Business-day and holiday due-date logic
- RRULE or advanced recurrence expressions
- Cross-workspace templates
- Template versioning
- Advanced execution history UI
- Notification fan-out for recurring execution
- Member-facing repeat-work permissions beyond admins
