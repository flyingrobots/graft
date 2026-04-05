# Invariant: Materialization Is Deterministic

**Status:** Enforced (by git-warp CRDT semantics)
**Legend:** WARP

## What must remain true

Materializing the same worldline position twice yields the same
structural state.

## Why it matters

The entire model depends on "materialization at any tick yields the
structural state at that commit." If replay is nondeterministic, the
worldline is fiction. Observer projections become unreliable.
Structural comparisons between two points become meaningless.

## How to check

- Repeated materialization at the same commit hash produces
  byte-for-byte equivalent structural projections
- Checkpointed replay and full replay agree
- Same inputs, same graph, same observer lens, same output
- Test: materialize, mutate nothing, materialize again, assert equal
