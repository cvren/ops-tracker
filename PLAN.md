# PLAN

## Milestones

1. M2 scope lock and audit
   - Acceptance criteria:
     - handoff and markdown docs describe M2 instead of M1
     - M1 foundations are confirmed without broad rework
     - gaps in comments, activity, and inbox are identified from the current codebase
2. Activity and notification model completion
   - Acceptance criteria:
     - activity event types cover comment mentions and blocked/unblocked states
     - notification fan-out is centralized, deduplicated, and suppresses self-notifications
     - schema, migration, and seed reflect M2 behavior
3. Comment and timeline UI
   - Acceptance criteria:
     - task detail shows comment composer and comment list
     - timeline shows actor, event kind, summary, and timestamp
     - viewer remains read-only
4. Inbox UI and navigation
   - Acceptance criteria:
     - inbox is reachable from nav
     - unread badge appears in nav
     - notifications open the relevant task detail
     - read/unread actions work
5. Seed, test, and docs closure
   - Acceptance criteria:
     - seed data demonstrates comments, mentions, activity, and unread/read notifications
     - Playwright covers comment, mention, inbox, changes requested, re-review, and done
     - validation commands pass locally and README matches the demo
6. M3 handoff
   - Acceptance criteria:
     - deferred items are listed explicitly in `STATUS.md`
     - M3 ideas do not block M2 completion

## Current cycle

- Scope: Milestone 2
- Status: completed
- Acceptance:
  - M1 foundations stay intact while comments, timeline, and inbox become visible and validated
  - fan-out and activity generation stay centralized around shared helpers
  - docs and demo steps now reflect the M2 workflow
- Closeout scope:
  - observe GitHub-hosted workflow execution for the current M2 state, or record a concrete blocker
  - resolve or explicitly disposition the `corepack pnpm install` ignored build-scripts warning
  - harden the serial-run constraint so local docs and CI cannot be read as parallel-safe
  - update `PLAN.md`, `STATUS.md`, `README.md`, and `RELEASE_NOTES_v0.2.0.md` to the latest measured truth
- Closure audit:
  - `[done]` Comments are created and rendered from real task data, with read-only viewer behavior preserved
  - `[done]` Structured mentions are stored durably and routed through shared notification helpers
  - `[done]` `ActivityEvent` covers comment, review, assignment, due date, and blocked-state changes
  - `[done]` Inbox, unread badge, and read transitions are implemented and linked back to task anchors
  - `[done]` Seed, unit tests, Playwright, README, and release notes all reflect the shipped M2 flow
  - `[done]` GitHub-hosted runner validation is observable on `codex/**` branches, so the pushed closeout branch head can be used as the final remote gate
  - `[done]` The ignored build-scripts warning was eliminated by pinning `pnpm@10.19.0`, moving build-script policy into `pnpm-workspace.yaml`, and rebuilding once in an upgraded checkout
  - `[done]` Serial-run constraints are explicit in local docs and CI, and branch pushes under `codex/**` now trigger the same GitHub validation path used for closeout
  - `[done]` Playwright closeout hardening now uses durable state assertions, a single worker, and a fixed `127.0.0.1` dev-server path to match the seeded M2 workflow more reliably
- Validation commands:
  - `corepack pnpm install`
  - `docker compose up -d`
  - `corepack pnpm exec prisma generate`
  - `corepack pnpm exec prisma migrate deploy`
  - `corepack pnpm db:seed`
  - `corepack pnpm lint`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm test:e2e`
  - `corepack pnpm build`

## Architecture decisions

- Keep the existing database-backed session auth and `Membership.role` authorization boundary
- Reuse existing `Comment`, `CommentMention`, `ActivityEvent`, and `Notification` entities already present in the repository
- Keep fan-out logic in shared activity helpers instead of introducing a queue or event-bus abstraction
- Use structured mention selection rather than free-text parsing
- Keep the product single-workspace in `v0.2.0`
- For M2 closure, add no net-new code unless a missing behavior is reproduced from the current repository state
- Tooling changes are allowed during closeout only when they remove ambiguity from validation or CI behavior without expanding product scope

## Validation strategy

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
