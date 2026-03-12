# STATUS

## Current state

- Current shipped release is `v0.4.0`
- `package.json` is now `0.4.0` on the current branch head
- The `v0.4.0` GitHub Release is published
- The current repo now reflects the shipped `ops-tracker v0.4.0 Phase 0–4` baseline
- The next implementation line is `v0.5.0`
- Canonical contract doc: `docs/contracts/v0.4.0-operating-contract.md`
- Canonical handoff doc: `docs/handoffs/v0.3.0-to-v0.4.0.md`
- Forward handoff doc: `docs/handoffs/v0.4.0-to-v0.5.0.md`
- `Membership.role` is the workspace-scoped role source of truth with `ADMIN`, `MANAGER`, `MEMBER`, and `VIEWER`
- Workspace membership management and manager-role assignment remain admin-only
- The manager console is now delegated to `ADMIN` and `MANAGER`
- Role changes now emit `MEMBERSHIP_ROLE_CHANGED` plus `MANAGER_ROLE_GRANTED` or `MANAGER_ROLE_REVOKED`
- `RecurringExecution` now matches the `v0.4.0 Phase 0` contract shape and acts as the recurring execution ledger
- Manual `Generate now`, failed-slot rerun, and scheduled tick now share the same recurring execution pipeline
- Generated tasks now link back to their source execution through `Task.recurringExecutionId`
- Templates now expose execution history with `RUNNING`, `SUCCESS`, `FAILED`, and `SKIPPED` rows plus failure detail for both `USER` and `SYSTEM` executions
- Failed executions can now be rerun by managers, including failures that originated from scheduled `SYSTEM` execution
- Activity history now includes recurring execution start, success, failure, and rerun events for both manual and scheduled attempts
- `corepack pnpm recurring:tick` now exists and runs active due schedules through the shared ledger pipeline
- Duplicate-safe slot claims are now enforced in the database for `RUNNING`, `SUCCESS`, and `SKIPPED` answers on the same `recurringScheduleId + scheduledFor` slot
- Fresh-seed scheduled truth for the shipped `v0.4.0` baseline is: `recurring:tick` reports `Due: 2`, `Succeeded: 1`, `Failed: 0`, `Skipped: 1`; the visible scheduled failure is the seeded `Recovery retry drill` ledger row and the skipped slot tells operators to recover it via rerun
- `SKIPPED` is contract-valid, schema-backed, and UI-visible through seeded history, but current scheduled skip suppression does not create a new ledger row and no manager skip action is exposed
- GitHub-hosted `ci` has been observed green for the shipped `v0.4.0` line with both `validate` and `e2e` succeeding

## v0.4.0 shipped baseline

- `[done]` shipped release boundary reconciled
  - README, SPEC, PLAN, STATUS, release notes, contract docs, and handoffs now describe the same shipped `v0.4.0` Phase 0–4 baseline
- `[done]` package/version boundary reconciled
  - current branch head now carries `package.json` version `0.4.0`
  - shipped `v0.4.0` is now the current release marker and `v0.5.0` is the next line of work
- `[done]` validation truth reconciled
  - the local Phase 4 command set now records one consistent result set for install, migrations, seed, lint, typecheck, unit tests, e2e, build, and scheduled tick
- `[done]` sandbox and tooling caveats separated
  - the local Playwright `NO_COLOR` warning is treated as an environment artifact and is kept out of normal README instructions
- `[partial]` `SKIPPED` semantics remain explicitly limited
  - `SKIPPED` is contract-valid and seeded/UI-visible
  - manager skip action and fresh ledger rows for tick-suppression skips remain outside `v0.4.0`
- `[done]` hosted `ci`
  - GitHub-hosted `ci` was observed for the shipped `v0.4.0` line
  - `validate` succeeded
  - `e2e` succeeded

## Locked decisions

- `v0.4.0` theme: `Delegation you can trust, automation you can inspect`
- The only canonical Phase 0–3 contract path is `docs/contracts/v0.4.0-operating-contract.md`
- The only canonical `v0.3.0` to `v0.4.0` handoff path is `docs/handoffs/v0.3.0-to-v0.4.0.md`
- The canonical forward handoff path is `docs/handoffs/v0.4.0-to-v0.5.0.md`
- The `v0.4.0` role model remains fixed to `admin`, `manager`, `member`, and `viewer`
- `Membership.role` remains the only effective role source of truth for `v0.4.0`
- Manager responsibilities stay limited to dashboard / manager queues, bulk actions, template management, recurring management, execution history visibility, and rerun execution
- Manager exclusions stay fixed to workspace root settings, membership-wide management, manager re-delegation, and system-level scheduler configuration
- `RecurringExecution` is now the `v0.4.0` source-of-truth ledger for manual execution, scheduled execution, and rerun
- `Task.recurringExecutionId` remains the durable generated-task linkage for recurring output
- `recurringScheduleId + scheduledFor` is the slot boundary for duplicate-safe execution
- Duplicate safety is implemented with a partial unique index that blocks a second `RUNNING`, `SUCCESS`, or `SKIPPED` answer for the same slot while still allowing failed-slot reruns
- Scheduled failures remain operator-visible and require rerun instead of silent automatic retry
- Fresh-seed `recurring:tick` truth is one new `SYSTEM` success plus one skipped due slot; the scheduled failure used in the demo remains a seeded ledger row until a manager reruns it
- `SKIPPED` stays part of the contract vocabulary, but current runtime only produces seeded skip rows and tick-summary suppression; it does not expose a manager skip action or create a new skip row for every suppressed tick outcome
- The current shipped release is `v0.4.0`, and the next implementation line is `v0.5.0`
- Hosted `ci` was observed green for the shipped `v0.4.0` release and remains the baseline gate for future release lines

## Next step

- Start `v0.5.0` work from `docs/handoffs/v0.4.0-to-v0.5.0.md`

## Known issues

- [follow-up] `/workspace` remains visible as a read-only roster page for non-admin roles; membership mutations stay admin-only
- [follow-up] skip action and `RECURRING_EXECUTION_SKIPPED` runtime behavior remain optional and are still not exposed as a manager action
- [follow-up] execution history currently lives in the templates console and task origin panel only; there is still no dedicated cross-schedule execution history screen
- [warning] Playwright prints `NO_COLOR` warnings under the local desktop shell because `FORCE_COLOR` is set; this is an environment artifact, not a repo defect

## Exact run commands

- `corepack pnpm install`
  - passed
- `docker compose up -d`
  - passed
- `corepack pnpm exec prisma generate`
  - passed
- `corepack pnpm exec prisma migrate deploy || corepack pnpm exec prisma migrate dev`
  - `migrate deploy` passed and applied `20260312170000_v0_4_0_phase_3_controlled_scheduled_execution`
- `corepack pnpm db:seed`
  - passed
  - prints `Seeded ops-tracker v0.4.0 demo data.`
- `corepack pnpm lint`
  - passed
- `corepack pnpm typecheck`
  - passed
- `corepack pnpm test`
  - passed (`14` files, `75` tests)
- `corepack pnpm test:e2e`
  - passed (`5` Playwright specs)
  - reseeds the demo baseline at suite teardown so the final `recurring:tick` validation still measures the fresh-seed scheduled outcome
- `corepack pnpm build`
  - passed
- `corepack pnpm recurring:tick`
  - passed
  - after a fresh seed it reported `Due: 2`, `Succeeded: 1`, `Failed: 0`, `Skipped: 1`
  - `Scheduled inventory digest` produced the new `SYSTEM` success row
  - `Recovery retry drill` was skipped because the seed already includes a failed execution for that same slot

## GitHub-hosted ci

- Workflow: `ci`
- Release line: `v0.4.0`
- Hosted jobs observed green:
  - `validate`
  - `e2e`
