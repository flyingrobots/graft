# Cycle 0039 Retro — Release Readiness Hardening

**Hill:** Clear the remaining ASAP release-readiness backlog by
hardening `run_capture`, adding a release-time dependency/security gate,
and removing the current Vite advisory path from the package graph.

## Outcome

**Met**

## What shipped

- `run_capture` now has an explicit enable/disable posture via config
- persisted capture logs can be disabled entirely
- persisted capture output is redacted for obvious secret-shaped values
  before it is written
- release preflight now includes a real `security:check` gate
- the release workflow runs that gate before packaging
- the Vite advisory path was updated out of the vulnerable range

## Notes

- this cycle tightened release readiness without pretending that
  `run_capture` is now safe for every deployment model
- the deeper architectural follow-on remains the Git/Shell execution
  seam already tracked in backlog
