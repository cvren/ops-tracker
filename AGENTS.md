# AGENTS.md

## Repository operating rules

- Read `SPEC.md`, `PLAN.md`, and `STATUS.md` before starting work and again before closing a milestone.
- Treat `SPEC.md` as the primary specification when requirements conflict.
- Keep `PLAN.md` current with milestones, acceptance criteria, validation commands, and architecture decisions.
- Keep `STATUS.md` current with the repository state, next step, decisions, known issues, and exact run commands.

## Execution loop

1. Pick the next smallest milestone that advances the product.
2. Implement it.
3. Validate it.
4. Fix the root cause of any failure and rerun validation.
5. Update `PLAN.md` and `STATUS.md`.
6. Continue until the deliverables and validation requirements are complete.

## Completion rules

- Do not stop at scaffold, TODOs, or mock-only flows.
- Do not mark the work complete before the validation commands pass, or are explicitly recorded as blocked.
- If information is missing but the result would not materially change, make a reasonable assumption and record it in `STATUS.md`.
- Ask only one short question when a high-impact architectural choice is truly unclear.
