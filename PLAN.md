# PLAN

## Release baseline

- Current shipped release remains `v0.3.0`
- Current branch head is the `ops-tracker v0.4.0 Phase 4 — Release Closeout` release-ready candidate
- `package.json` is prepared at `0.4.0` on the release-ready branch head while the shipped release marker remains `v0.3.0` until PR / merge / tag / GitHub Release
- The current repo has now implemented `ops-tracker v0.4.0 Phase 0–4` locally while keeping shipped `v0.3.0` history intact

## v0.4.0 phase order

1. `ops-tracker v0.4.0 Phase 0 — Operating Contract`
   - Status: completed
   - Depends on: current repo audit of shipped `v0.3.0` behavior and docs
   - Acceptance criteria:
     - `docs/contracts/v0.4.0-operating-contract.md` exists
     - role model, ledger contract, scheduler entrypoint, milestone order, and non-goals are fixed in repo docs
     - current shipped `v0.3.0` truth is kept separate from future `v0.4.0` implementation
2. `ops-tracker v0.4.0 Phase 1 — Safe Delegation`
   - Status: completed
   - Depends on: `Phase 0`
   - Acceptance criteria:
     - `manager` exists in schema, runtime, permission helpers, and seed data
     - admins can grant and revoke manager access inside a workspace
     - managers can use dashboard, manager queues, bulk actions, templates, recurring schedules, and manual `Generate now`
     - managers remain blocked from workspace root settings, membership-wide management, manager re-delegation, and scheduler configuration
     - role changes emit inspectable activity trace for manager grant and revoke
     - `member` collaboration flow and `viewer` read-only behavior remain intact
3. `ops-tracker v0.4.0 Phase 2 — Execution Ledger`
   - Status: completed
   - Depends on: `Phase 0`, `Phase 1`
   - Acceptance criteria:
     - `RecurringExecution` matches the contract shape and becomes the source-of-truth ledger
     - execution statuses include `RUNNING`, `SUCCESS`, `FAILED`, and `SKIPPED`
     - manual executions are ledgered with trigger provenance
     - execution history reads from the ledger, not from inferred task side effects
     - generated tasks can be traced back to the execution that created them
     - failure detail is visible to managers
     - rerun creates a fresh execution record through the same manual pipeline
4. `ops-tracker v0.4.0 Phase 3 — Controlled Scheduled Execution`
   - Status: completed
   - Depends on: `Phase 0`, `Phase 1`, `Phase 2`
   - Acceptance criteria:
     - `corepack pnpm recurring:tick` exists as the official scheduled entrypoint
     - scheduled and manual recurring execution use the same core pipeline
     - active due schedules are selected with `nextRunAt <= now`
     - `SYSTEM` executions are recorded in the `RecurringExecution` ledger
     - duplicate-safe execution is enforced
     - failed executions are inspectable and rerunnable
     - skip support remains optional
5. `ops-tracker v0.4.0 Phase 4 — Release Closeout`
   - Status: completed
   - Depends on: `Phase 1`, `Phase 2`, `Phase 3`
   - Acceptance criteria:
     - docs, tests, and release notes describe the same `v0.4.0` boundary
     - validation results are recorded for the implemented runtime
     - current branch head hosted `ci` result is observed or blocked explicitly
     - shipped `v0.3.0` history and release-ready `v0.4.0` scope are clearly separated
     - `docs/handoffs/v0.4.0-to-v0.5.0.md` exists
     - remaining blockers are explicit

## Current cycle

- Scope: `ops-tracker v0.4.0 Phase 4 — Release Closeout`
- Status: completed
- Checklist:
  - `[done]` audited current branch-head runtime, schema, seed, recurring pipeline, tests, and workflows against the Phase 0 contract and Phase 1–3 delivery boundary
  - `[done]` promoted the current branch-head package version to `0.4.0` while keeping shipped `v0.3.0` history explicit in docs and release notes
  - `[done]` reconciled README, SPEC, PLAN, STATUS, release notes, contract docs, and the `v0.3.0 -> v0.4.0` handoff to the same release-ready truth
  - `[done]` created the forward handoff at `docs/handoffs/v0.4.0-to-v0.5.0.md`
  - `[done]` reran the Phase 4 validation command set on the release-ready head
  - `[done]` observed GitHub-hosted `ci` on the pushed release-ready branch head with both `validate` and `e2e` succeeding
  - `[warning]` sandbox/tooling noise such as the local Playwright `NO_COLOR` warning is treated as an environment artifact, not a repo defect, and stays out of README instructions
  - `[partial]` `SKIPPED` remains contract-valid and UI-visible, but manager skip action and fresh ledger rows for tick-suppression skips remain intentionally out of `v0.4.0`

## Architecture decisions

- Keep the `v0.4.0` operating role model fixed to `admin`, `manager`, `member`, and `viewer`
- Keep `Membership.role` as the workspace-scoped role source of truth
- Do not introduce a capability matrix, custom role builder, or advanced capability editor in `v0.4.0`
- Keep workspace membership management admin-only even after manager-console delegation
- Keep manager-console routes and mutations on the same central permission helper boundary
- Record manager grant and revoke operations through the existing `ActivityEvent` model instead of a separate audit system
- Treat `RecurringExecution` as the authoritative execution ledger for manual recurring attempts and reruns
- Link generated recurring tasks directly to their source execution through `Task.recurringExecutionId`
- Use `recurringScheduleId + scheduledFor` as the slot boundary for recurring execution claims
- Keep manual `Generate now`, scheduled tick, and failed-slot rerun on the same core execution pipeline
- Enforce duplicate-safe slot claims through a partial unique index that allows only one `RUNNING`, `SUCCESS`, or `SKIPPED` answer per slot while still allowing failed-slot reruns
- Keep scheduled automation as a single CLI tick entrypoint instead of introducing queue or worker infrastructure
- Treat `docs/contracts/v0.4.0-operating-contract.md` and `docs/handoffs/v0.3.0-to-v0.4.0.md` as the only canonical Phase 0–3 docs; old `M4` paths remain alias stubs only
- Treat `SKIPPED` as contract-valid and UI-visible, but keep current scheduled skip suppression explicit as summary-only unless a real `RecurringExecution` row already exists
- Keep shipped-release messaging pinned to `v0.3.0` until the human merge / tag / GitHub Release steps complete, even though the release-ready branch head now carries `package.json` version `0.4.0`
- Keep sandbox-specific warnings in `STATUS.md`, not in README or the contract docs, unless they affect normal developer workflow

## Validation strategy

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
corepack pnpm recurring:tick
```
