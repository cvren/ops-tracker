# STATUS

## Current state

- `v0.2.0 Milestone 2` is implemented and validated locally
- Task detail now stores and displays comments from real data
- Structured mentions are stored in `CommentMention` and drive notification fan-out
- `ActivityEvent` now covers comment mention plus blocked/unblocked states and powers task timelines
- Inbox is reachable from nav, shows unread/read state, and links back to the relevant task
- M1 ownership, review, and saved-view flows remain intact
- Task transition feedback now survives refresh, and the e2e path waits on durable task-detail state instead of transient timing
- M2 final hardening is focused only on GitHub workflow observation, pnpm install-warning disposition, and serial-run closeout

## M2 gap audit

- `[done]` Comments: task detail has a real comment composer and list, `Comment` persists task/author/body/timestamps, empty comments are rejected, and viewers stay read-only
- `[done]` Mentions: structured multi-select saves durable `CommentMention` rows and suppresses self-notifications
- `[done]` Activity events: shared helpers create task, assignment, reviewer, due date, status, blocked/unblocked, review, comment, and mention events with actor/timestamp/summary payloads
- `[done]` Inbox: `Notification` references `ActivityEvent`, dedupes by `(userId, activityEventId)`, supports unread/read, shows a nav badge, and links back to relevant task anchors
- `[done]` Timeline: task detail renders actor, event kind, summary, and timestamp so comment/review/status flow is readable from the UI
- `[done]` Seed, tests, docs, and release notes: seed includes comments, mentions, review events, and read/unread notifications; unit and Playwright cover the M2 happy path
- `[partial]` Closeout hardening: GitHub-hosted runner observation, pnpm install-warning disposition, and serial-run wording are still being audited in this pass

## Next step

- Finish M2 closeout by turning the remaining `[follow-up]` items into either observed success or concrete `[blocked]` limitations.

## Decisions

- `SPEC.md` is now scoped to M2 completion instead of M1
- Membership, not legacy `User.role`, remains the effective authorization boundary
- Single-workspace UX remains the only supported collaboration model in `v0.2.0`
- Notification fan-out stays centralized around shared activity helpers instead of adding a generic queue or event bus
- Structured mention selection is used instead of free-text parsing
- Minimal code changes are acceptable during closure only when a shipped gap is reproduced; this pass used that rule for task transition feedback persistence

## Known issues

- `[follow-up]` GitHub-hosted runner execution cannot be observed from this environment until the repository is connected to a remote and pushed
- `[follow-up]` `corepack pnpm install` still emits an ignored build-scripts warning for optional/native packages, although install and all validation commands pass
- `[follow-up]` Running `pnpm build` in parallel with `pnpm test:e2e` in the same working tree can race on `.next` artifacts and surface a transient `/_document` lookup failure; serial validation avoids the issue

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

- `corepack pnpm install`: passed, with ignored build-scripts warning only
- `docker compose up -d`: passed
- `corepack pnpm exec prisma generate`: passed
- `corepack pnpm exec prisma migrate deploy`: passed, no pending migrations
- `corepack pnpm db:seed`: passed
- `corepack pnpm lint`: passed
- `corepack pnpm typecheck`: passed
- `corepack pnpm test`: passed, 7 files / 34 tests
- `corepack pnpm test:e2e`: passed, 1 Playwright spec
- `corepack pnpm build`: passed when run serially after the rest of the validation path

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
