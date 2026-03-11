# SPEC

## Product

- Project name: `ops-tracker`
- Version target: `v0.2.0`
- Implementation target: `Milestone 2: Comment + ActivityEvent + Notification Inbox`
- Package name prefix: `@ops-tracker/*`
- Docker Compose project name: `ops-tracker`
- Environment variable prefix: `OPS_TRACKER_`

## Milestone goal

`ops-tracker` must keep the task context inside the product so handoff, review return, and mentions do not get lost in chat or memory.

Milestone 2 is complete only when the following are true:

1. Comments are created and rendered from real task data.
2. Mentions are stored durably and drive activity and notifications.
3. Activity timeline shows who changed what and when.
4. Inbox shows unread and read notifications with direct links back to the task.
5. M1 ownership, review, and saved-view flows still work.

## Core entities in M2

- User
- Workspace
- Membership
- Project
- Task
- Comment
- CommentMention
- ActivityEvent
- Notification
- Session

## M2 required scope

- Keep the M1 workspace and review foundation intact
- Task comments:
  - `taskId`
  - `authorId`
  - `body`
  - `createdAt`
  - `updatedAt`
- Structured mentions through workspace-member selection
- `ActivityEvent` event coverage for:
  - task created
  - task updated
  - assignee changed
  - reviewer changed
  - due date changed
  - status changed
  - blocked
  - unblocked
  - review requested
  - changes requested
  - review approved / done
  - comment created
  - mention created
- Task detail UI:
  - comment composer
  - comment list
  - activity timeline
- Inbox UI:
  - unread/read state
  - newest first
  - nav badge
  - direct link to the relevant task
- Notification fan-out minimum:
  - assignee set
  - reviewer set
  - review request
  - changes requested
  - mention
  - comment on a task the user is involved in
- Self-notification suppression
- Notification dedupe for the same user and same event
- Seed data and Playwright for the comment/timeline/inbox happy path

## Deferred to M3

- Email notifications
- Slack notifications
- Real-time updates
- Attachment support
- Rich text editor
- Comment edit/delete/threading
- Advanced notification preferences
- Bulk notification actions as a milestone goal
- Analytics, SLA, escalation, webhook, and automation features

Repository note:

- Existing foundations for later milestones may remain in the repository, but M2 completion is limited to the scope above.

## Technical constraints

- Keep the existing Next.js, TypeScript, Prisma, PostgreSQL, pnpm, Vitest, Playwright, Tailwind, Docker Compose, and GitHub Actions stack
- Keep the existing auth, session, membership, and review guard intact
- Use structured mentions instead of brittle free-text parsing
- Do not do project-wide refactors
- Keep `v0.1.0` core flow and M1 flow working

## Deliverables for M2

- Working source code for comments, mentions, activity timeline, and inbox
- Prisma schema and SQL migration updates
- Seed data for the M2 demo
- Updated README and environment template
- Updated `docs/handoffs/v0.1.0-to-v0.2.0.md`, `SPEC.md`, `PLAN.md`, `STATUS.md`, and release notes
- Unit and Playwright coverage for the M2 flow

## M2 done when

- Task detail stores and displays comments from real data
- Mentions are stored and drive notification fan-out
- Activity timeline shows key task and review events
- Inbox supports unread/read and shows unread count in nav
- Self-notification suppression and dedupe work
- M1 ownership, review, and saved views still work
- Seed data supports the intended five-minute M2 demo
- `STATUS.md` lists M3 deferred items
- The following commands pass:
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
