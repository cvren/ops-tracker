# m3 to m4 handoff

## Current state
- v0.3.0 is released
- v0.3.0 tag exists on main
- current repository state on main is the source of truth for m4

## Completed in m3
- manager console shipped
- bulk queue operations shipped
- templates and recurring generation shipped
- release notes were prepared
- v0.3.0 was merged and tagged

## Verified
- lint passed
- typecheck passed
- unit test passed
- build passed

## Known issues
- [follow-up] The most recent local `pnpm test:e2e` rerun showed 2 failures and must be reconciled before claiming a fully green closeout.

## Start point for m4
- start m4 from main
- use a new Codex thread
- use a Permanent worktree if m4 is long-running
- use this file, RELEASE_NOTES_v0.3.0.md, and current main as source of truth

## Non-goals
- do not continue implementation in the m3 closeout thread
