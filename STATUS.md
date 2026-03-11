# STATUS

## Current state

- `v0.2.0 Milestone 2` is implemented and validated locally
- `v0.2.0 Milestone 2` closeout now includes a hardened Playwright path: single-worker execution, durable state assertions, and a fixed `127.0.0.1` dev-server target
- Task detail now stores and displays comments from real data
- Structured mentions are stored in `CommentMention` and drive notification fan-out
- `ActivityEvent` now covers comment mention plus blocked/unblocked states and powers task timelines
- Inbox is reachable from nav, shows unread/read state, and links back to the relevant task
- M1 ownership, review, and saved-view flows remain intact
- Task transition feedback now survives refresh, and the e2e path waits on durable task-detail state instead of transient timing
- M2 final hardening is complete locally: install-warning disposition, serial-run closeout, and e2e hardening are all resolved before the final hosted branch-head observation

## M2 gap audit

- `[done]` Comments: task detail has a real comment composer and list, `Comment` persists task/author/body/timestamps, empty comments are rejected, and viewers stay read-only
- `[done]` Mentions: structured multi-select saves durable `CommentMention` rows and suppresses self-notifications
- `[done]` Activity events: shared helpers create task, assignment, reviewer, due date, status, blocked/unblocked, review, comment, and mention events with actor/timestamp/summary payloads
- `[done]` Inbox: `Notification` references `ActivityEvent`, dedupes by `(userId, activityEventId)`, supports unread/read, shows a nav badge, and links back to relevant task anchors
- `[done]` Timeline: task detail renders actor, event kind, summary, and timestamp so comment/review/status flow is readable from the UI
- `[done]` Seed, tests, docs, and release notes: seed includes comments, mentions, review events, and read/unread notifications; unit and Playwright cover the M2 happy path
- `[done]` GitHub-hosted runner observation path: workflow `ci` is reachable from `codex/**` branch pushes, so the pushed closeout branch head can be used as the final remote gate
- `[done]` Install warning disposition: no ignored build-scripts warning remains on `corepack pnpm install` after pinning `pnpm@10.19.0`, moving the allow/ignore lists into `pnpm-workspace.yaml`, and running `corepack pnpm rebuild` once in this upgraded checkout
- `[done]` Serial-run hardening: docs and CI both enforce the local `test:e2e` then `build` order, and branch pushes under `codex/**` trigger the same hosted validation path
- `[done]` Playwright hardening: the M2 e2e flow now runs with one worker, uses durable state instead of transient toast timing, and keeps the local dev-server path fixed at `127.0.0.1:3100`

## Next step

- Observe the pushed `codex/m2-closeout` branch head on GitHub Actions, then treat M2 as fully closed and move to a separate M3 scope decision.

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

- No open local M2 issues remain after hardening. The only remaining closeout gate is the pushed branch-head GitHub Actions result.

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
- `corepack pnpm exec playwright test --repeat-each=3`: passed with `workers: 1`, confirming the hardened M2 flow stays stable when repeated sequentially
- `corepack pnpm build`: passed when run serially after the rest of the validation path
- GitHub-hosted runner:
  - workflow: `ci`
  - trigger path: `push` to `codex/**`, `pull_request`, or `main`
  - final closeout rule: observe the pushed `codex/m2-closeout` branch head before declaring M2 fully closed

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
