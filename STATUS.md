# STATUS

## Current state

- `ops-tracker` has shipped the full `v0.3.0` feature boundary locally
- The branch is in release-ready closeout state; no new product scope was added during reconciliation
- Current branch name: `codex/v0.3-m3`
- Current branch tracks `origin/codex/v0.3-m3`

## Release-ready reconciliation audit

- `[done]` `package.json` is on version `0.3.0`
- `[done]` Local validation truth has been measured from the current repository state
- `[done]` The shipped M3 boundary is present in code: dashboard drill-down, manager bulk actions, templates, recurring schedules, and manual generation
- `[done]` Repo docs are normalized from milestone-implementation wording to `v0.3.0` release-ready wording
- `[done]` Current branch-head GitHub-hosted `ci` has been observed as success for both `validate` and `e2e`

## Next step

- Open or update the release PR, merge `codex/v0.3-m3` into `main`, tag the merge commit as `v0.3.0`, and publish the GitHub Release from `RELEASE_NOTES_v0.3.0.md`

## Decisions

- No new scope is allowed during this closeout; only reconciliation, validation, and release-readiness work is in bounds
- Sandbox-specific caveats stay in `STATUS.md` unless they represent a real repository defect in a normal developer environment
- Admin-only manager-console permissions remain part of the shipped `v0.3.0` boundary and are not widened here
- Recurring execution remains manual in `v0.3.0`; M4 may build on it, but this closeout does not

## Environment notes

- In this sandbox, `corepack pnpm db:seed` was equivalent to `set -a; source .env; set +a; node --import tsx prisma/seed.ts` because `tsx` IPC pipes are restricted
- In this sandbox, `corepack pnpm install` emitted an npm registry metadata warning because outbound network resolution is restricted
- These notes are environment-specific and are not treated as `v0.3.0` repository defects

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
- GitHub Actions `ci` on `origin/codex/v0.3-m3`
  - observed success for `validate` and `e2e` on the current pushed branch head

## Release handoff

1. Open or refresh the PR from `codex/v0.3-m3` into `main`
2. Merge the approved PR into `main`
3. Tag the merge commit: `git switch main && git pull && git tag v0.3.0 <merge-sha> && git push origin v0.3.0`
4. Publish the GitHub Release from tag `v0.3.0` using `RELEASE_NOTES_v0.3.0.md`
5. Start M4 only after the merge, tag, and release publish are complete

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
