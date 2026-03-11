# RELEASE NOTES v0.2.0

## Summary

`ops-tracker` `v0.2.0 Milestone 2` keeps task context inside the product. Comments, activity history, and inbox notifications now make review handoff and returned work visible without depending on Slack or memory.

## Added in M2

- Task comment composer and comment list on the task detail page
- Structured mentions backed by `CommentMention`
- New `ActivityEvent` coverage for mention, blocked, and unblocked states
- Task activity timeline with actor, event kind, summary, and timestamp
- In-app inbox page with unread/read state
- Nav badge for unread notification count
- Direct links from inbox notifications back to the relevant task anchor

## Changed in M2

- Notification fan-out is deduplicated and suppresses self-notifications
- Task transition feedback now survives the refresh that updates status and timeline state
- `pnpm` is now pinned to `10.19.0`, with build-script policy stored in `pnpm-workspace.yaml`, which removes the prior ignored build-scripts warning on install
- Seed data now includes comments, mentions, unread notifications, and read notifications
- Playwright now covers comment, mention, inbox, changes requested, re-review, and done
- GitHub Actions now validates `codex/**` branch pushes as well as `main` and pull requests
- README, `SPEC.md`, `PLAN.md`, and `STATUS.md` now reflect the final M2 closeout state

## Validation

Validated locally with the serial command path below:

```bash
corepack pnpm install
docker compose up -d
corepack pnpm exec prisma generate
corepack pnpm exec prisma migrate deploy || corepack pnpm exec prisma migrate dev
corepack pnpm db:seed
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

GitHub-hosted validation was also observed on [run `22938471401`](https://github.com/cvren/ops-tracker/actions/runs/22938471401) for branch `codex/m2-closeout`, commit `4cb5c1b`, with overall result `success`.
