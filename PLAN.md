# PLAN

## Milestones

1. M3.1 manager dashboard and drill-down query foundation
   - Status: completed
2. M3.2 bulk action slice
   - Status: completed
3. M3.3 repeat-work slice
   - Status: completed
4. M3 final reconciliation and release-ready closeout
   - Status: completed
   - Acceptance criteria:
     - local validation truth is recorded from the current repository state
     - stale milestone wording and stale counts are removed from repo docs
     - current branch-head hosted CI is observed as success
     - release notes and handoff match the shipped `v0.3.0` boundary
5. M4 next slice
   - Status: pending
   - Acceptance criteria:
     - scope stays additive beyond the shipped `v0.3.0` boundary
     - no M4 work starts before `v0.3.0` release closeout is settled

## Current cycle

- Scope: `v0.3.0 release-ready closeout`
- Status: completed on the current branch head
- Reconciliation checklist:
  - `[done]` shipped M3.1 / M3.2 / M3.3 scope exists in the repository implementation
  - `[done]` local validation truth has been measured for install, db, lint, typecheck, test, e2e, and build
  - `[done]` repo docs now describe `v0.3.0` as release-ready instead of treating M3.3 as the active slice
  - `[done]` current branch-head hosted CI has been observed as success for `validate` and `e2e`

## Architecture decisions

- Reuse the existing `/tasks` route and `TaskListClient` for manager bulk operations instead of creating a separate batch-edit surface
- Reuse the existing manager console data/actions/components for templates and recurring work instead of inventing a second automation surface
- Keep manager bulk mutations admin-only in `v0.3.0`
- Keep recurring execution manual in `v0.3.0`; no background worker or scheduler
- Keep sandbox-specific caveats out of the normal README workflow unless they represent a real repository defect

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
```
