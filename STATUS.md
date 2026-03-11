# STATUS

## Current state

- `v0.2.0 Milestone 2` is implemented and validated locally
- `v0.2.0 Milestone 2` is now also observed on a GitHub-hosted runner for branch `codex/m2-closeout` at commit `4cb5c1b`
- Task detail now stores and displays comments from real data
- Structured mentions are stored in `CommentMention` and drive notification fan-out
- `ActivityEvent` now covers comment mention plus blocked/unblocked states and powers task timelines
- Inbox is reachable from nav, shows unread/read state, and links back to the relevant task
- M1 ownership, review, and saved-view flows remain intact
- Task transition feedback now survives refresh, and the e2e path waits on durable task-detail state instead of transient timing
- M2 final hardening is complete: GitHub workflow observation, pnpm install-warning disposition, and serial-run closeout are all resolved

## M2 gap audit

- `[done]` Comments: task detail has a real comment composer and list, `Comment` persists task/author/body/timestamps, empty comments are rejected, and viewers stay read-only
- `[done]` Mentions: structured multi-select saves durable `CommentMention` rows and suppresses self-notifications
- `[done]` Activity events: shared helpers create task, assignment, reviewer, due date, status, blocked/unblocked, review, comment, and mention events with actor/timestamp/summary payloads
- `[done]` Inbox: `Notification` references `ActivityEvent`, dedupes by `(userId, activityEventId)`, supports unread/read, shows a nav badge, and links back to relevant task anchors
- `[done]` Timeline: task detail renders actor, event kind, summary, and timestamp so comment/review/status flow is readable from the UI
- `[done]` Seed, tests, docs, and release notes: seed includes comments, mentions, review events, and read/unread notifications; unit and Playwright cover the M2 happy path
- `[done]` GitHub-hosted runner observation: workflow `ci` run `22938471401` completed with `success` on `codex/m2-closeout` commit `4cb5c1b39d2d96b54e55cdacc986f86f7c45f84b`
- `[done]` Install warning disposition: no ignored build-scripts warning remains on `corepack pnpm install` after pinning `pnpm@10.19.0`, moving the allow/ignore lists into `pnpm-workspace.yaml`, and running `corepack pnpm rebuild` once in this upgraded checkout
- `[done]` Serial-run hardening: docs and CI both enforce the local `test:e2e` then `build` order, and branch pushes under `codex/**` trigger the same hosted validation path

## Next step

- Start `v0.2.0 Milestone 3` only after a separate scope decision; M2 closeout itself is complete.

## Decisions

- `SPEC.md` is now scoped to M2 completion instead of M1
- Membership, not legacy `User.role`, remains the effective authorization boundary
- Single-workspace UX remains the only supported collaboration model in `v0.2.0`
- Notification fan-out stays centralized around shared activity helpers instead of adding a generic queue or event bus
- Structured mention selection is used instead of free-text parsing
- Minimal code changes are acceptable during closure only when a shipped gap is reproduced; this pass used that rule for task transition feedback persistence
- `pnpm.onlyBuiltDependencies` is now enforced from `pnpm-workspace.yaml` under `pnpm@10.19.0`, which removes the previous install warning on a clean install
- The GitHub Actions workflow now runs on `main`, `pull_request`, and `codex/**` branch pushes so closeout branches can be observed without opening a PR first

## Known issues

- No open M2 issues remain in the repository state after closeout.

## Exact run commands

Validation commands completed for `v0.2.0 Milestone 2`:

```bash
corepack pnpm install
docker compose up -d
corepack pnpm exec prisma generate
corepack pnpm exec prisma migrate deploy
corepack pnpm db:seed
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

Results:

- `corepack pnpm install`: passed, no ignored build-scripts warning
- `corepack pnpm rebuild`: executed once after moving the build-script policy into `pnpm-workspace.yaml` so this upgraded checkout no longer carries stale ignored-build state
- `docker compose up -d`: passed
- `corepack pnpm exec prisma generate`: passed
- `corepack pnpm exec prisma migrate deploy`: passed, no pending migrations
- `corepack pnpm db:seed`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm test`: passed, 7 files / 34 tests
- `corepack pnpm test:e2e`: passed, 1 Playwright spec
- `corepack pnpm build`: passed when run serially after the rest of the validation path
- GitHub-hosted runner:
  - workflow: `ci`
  - branch: `codex/m2-closeout`
  - commit: `4cb5c1b39d2d96b54e55cdacc986f86f7c45f84b`
  - run: `22938471401`
  - result: `success`

## Demo target for M2

1. Sign in as the admin user.
2. Open `Dashboard` and `Workspace` to verify saved views and the membership roster.
3. Create a project and a task with owner, reviewer, and due date.
4. Sign in as the operator, open `My Tasks`, start work, add a comment, mention the reviewer, and request review.
5. Sign in as the reviewer, open `Inbox`, verify unread notifications, mark them read, and open `Needs Review`.
6. Open the task detail, inspect the comment and timeline, then return `Changes requested`.
7. Sign in as the operator, confirm the inbox update, add another comment with a mention, and request review again.
8. Sign in as the reviewer, open the inbox item back to the task, inspect the updated timeline, and approve the task.
9. Sign in as the operator, confirm the approval notification in `Inbox`, then verify `Overdue` and `Unassigned` still surface seeded risk items.

## Deferred items for M3

- Email notifications
- Slack notifications
- Real-time updates
- Attachment support
- Comment edit/delete/threading
- Advanced notification preferences and bulk actions
- Analytics, SLA, webhook, and automation features
