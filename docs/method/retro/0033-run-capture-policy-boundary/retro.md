# Cycle 0033 Retro — `run_capture` Policy Boundary

**Outcome:** Met

## What changed

- `run_capture` now returns an explicit machine-readable
  `policyBoundary` marker on both success and failure
- product docs describe `run_capture` as a diagnostic shell-output
  escape hatch outside bounded-read policy
- the consumed ASAP item has been removed

## What we learned

- trying to make arbitrary shell output look like a normal governed
  repo-read surface creates false trust
- the right move was not more partial policy plumbing; it was an
  explicit exception boundary
- this sharpens the remaining policy work around real bounded-read
  surfaces

## Follow-on work

- `docs/method/backlog/asap/CORE_cross-surface-policy-parity-tests.md`
- `docs/method/backlog/asap/CORE_versioned-json-output-schemas.md`
