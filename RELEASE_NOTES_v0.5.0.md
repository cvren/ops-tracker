# RELEASE NOTES v0.5.0

`v0.5.0` is release-ready on the current local branch head, but it is not published yet. This release note fixes the intended `v0.5.0` boundary, the verified local validation state, the latest hosted-CI observation, and the exact human steps required before the release is cut.

## Included in v0.5.0

### ops-tracker v0.5.0 Phase 0 — Commitment Contract

- Fixed the `v0.5.0` theme, subtheme, `CommitmentPolicy` contract, `ExceptionCase` contract, fixed kinds and statuses, dedupe rule, phase order, and non-goals

### ops-tracker v0.5.0 Phase 1 — Commitment Policies

- Added the bounded `CommitmentPolicy` runtime model for `WORKSPACE`, `PROJECT`, and `TEMPLATE` scope
- Added the manager-facing `/commitments` UI for listing, creating, and editing fixed-kind policies
- Added fixed-kind risk evaluation for `OVERDUE`, `REVIEW_STALE`, `BLOCKED_STALE`, `UNASSIGNED_STALE`, and `RECURRING_FAILED`

### ops-tracker v0.5.0 Phase 2 — Exception Ledger

- Added `ExceptionCase` as the source-of-truth exception ledger and work object
- Added deduped open-case creation through a stable `fingerprint`
- Added minimal auto-resolve when a source condition clears
- Added the `/exceptions` queue so managers can see open work with task or recurring drill-through

### ops-tracker v0.5.0 Phase 3 — Response & Escalation

- Added acknowledge, snooze, owner assignment, and manual resolve on `ExceptionCase`
- Added one derived outbound email channel through `ExceptionEmailDelivery`
- Kept delivery derived from the exception ledger instead of creating a parallel alert truth

### ops-tracker v0.5.0 Phase 4 — Release Closeout

- Reconciled repo docs, validation truth, release notes, and handoffs to one `v0.5.0` boundary
- Added the next-line handoff at `docs/handoffs/v0.5.0-to-v0.6.0.md`
- Fixed the exact human PR, merge, tag, and GitHub Release steps

## Known limits carried forward

- `UNASSIGNED_STALE` still measures from task `createdAt` because a dedicated `unassignedSince` timestamp does not exist yet
- Outbound delivery is still bounded to one derived email channel; multi-channel delivery, digesting, and advanced escalation remain out of scope
- `v0.5.0` is not a full incident platform, policy builder UI, generic automation builder, advanced SLA prediction, org hierarchy, BI product, or arbitrary rule engine

## Verified release baseline

- Local validation target:
  - `corepack pnpm exec prisma generate`
  - `docker compose up -d`
  - `docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U ops_tracker -d ops_tracker < prisma/migrations/20260314223000_v0_5_0_phase_3_response_and_escalation/migration.sql`
  - `node --env-file=.env.example --import tsx prisma/seed.ts`
  - `corepack pnpm lint`
  - `corepack pnpm typecheck`
  - `corepack pnpm test`
  - `corepack pnpm test:e2e`
  - `corepack pnpm build`
  - `cp .env.example .env && corepack pnpm recurring:tick`
  - `git diff --check`
- Current fresh-seed tick truth:
  - `Due: 2`
  - `Succeeded: 1`
  - `Failed: 0`
  - `Skipped: 1`
- Latest hosted GitHub Actions observation:
  - `origin/main` commit `2afe999a47fa29133897d736240922a144e66f3d`
  - run `#25` on March 12, 2026: `https://github.com/cvren/ops-tracker/actions/runs/22985172776`
  - `validate`: `success`
  - `e2e`: `success`
- Exact blocker:
  - the current local `v0.5.0` release-ready tree is not yet committed and pushed, so GitHub-hosted CI has not been observed for this exact tree

## Release-ready next human steps

1. Commit the current `v0.5.0` release-ready tree on a pushable branch.
2. Push that branch and wait for hosted `ci` to run on the exact `v0.5.0` tree.
3. Open a PR against `main` using this file and `docs/handoffs/v0.4.0-to-v0.5.0.md` as the release summary.
4. Bump `package.json` from `0.4.0` to `0.5.0` before merge or as part of the release commit.
5. Merge after hosted `validate` and `e2e` succeed.
6. Tag the merge commit as `v0.5.0` and publish the GitHub Release from this note.

## Post-release state

- Current shipped release remains `v0.4.0` until the release steps above are completed
- Current package version in the repo remains `0.4.0` until the release bump is applied
- The next implementation line after release is `v0.6.0`
