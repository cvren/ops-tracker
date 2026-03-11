# RELEASE NOTES v0.3.0

## Summary

`ops-tracker` `v0.3.0` ships the manager console stack on top of the `v0.2.0` collaboration baseline: manager patrol dashboards, admin bulk queue operations, and admin repeat-work generation.

## Landed in M3.1

- Manager dashboard with overdue, review, unassigned, blocked, due-soon, aging, workload, and bottleneck visibility
- Manager drill-down task views for review queue, blocked aging, due this week, high risk, and workload
- Route-level loading and error states for the dashboard and task queues
- Seed, unit tests, and Playwright coverage for the manager patrol route

## Landed in M3.2

- Multi-select on manager queues with row selection, current-page selection, selection count, and clear-selection control
- Admin-only bulk action bar for owner, reviewer, due date, status, blocked/unblocked, and priority updates
- All-or-nothing bulk mutation validation with task ID dedupe and workflow-safe guards
- `TASK_BULK_UPDATED` activity events on each affected task timeline
- Seeded manager demo path for unassigned, overdue, blocked, and high-risk bulk triage
- Playwright coverage for dashboard -> drill-down -> bulk update -> timeline verification

## Landed in M3.3

- Admin-only `/templates` console for template list/create/edit and recurring schedule list/create/edit
- `TaskTemplate` and `RecurringSchedule` authorship with `createdById` / `updatedById`
- Task generation from templates with mapped owner, reviewer, due-offset, status, and priority defaults
- Manual recurring execution with `Generate now`, `lastRunAt` / `nextRunAt` advancement, and duplicate-resistant `RecurringExecution(scheduleId, scheduledFor)`
- `TASK_TEMPLATE_CREATED`, `TASK_TEMPLATE_UPDATED`, `TASK_CREATED_FROM_TEMPLATE`, `RECURRING_SCHEDULE_CREATED`, `RECURRING_SCHEDULE_UPDATED`, and `RECURRING_SCHEDULE_EXECUTED`
- Seeded repeat-work demo path and Playwright coverage for template create -> generate task -> create schedule -> `Generate now`

## Preserved from v0.2.0

- Workspace role guard and single-workspace collaboration model
- Task comments, structured mentions, activity timeline, and inbox
- Ownership, review handoff, overdue, and unassigned workflows

## Validation snapshot

- `package.json` version: `0.3.0`
- `install`: passed
- `docker compose up -d`: passed
- `prisma generate`: passed
- `prisma migrate deploy`: passed
- `db:seed`: passed
- `lint`: passed
- `typecheck`: passed
- `test`: passed, `12` files / `65` tests
- `test:e2e`: passed, `3` Playwright specs
- `build`: passed

## Deferred beyond v0.3.0

- Background recurring execution
- Worker or queue infrastructure
- Cross-workspace templates and template versioning
- Member-facing repeat-work permissions
- No email, Slack, realtime updates, attachments, or advanced notification preferences
