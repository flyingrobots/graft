# Invariant: Ticks Are Monotonic

**Status:** Enforced (by git-warp Lamport timestamps)
**Legend:** WARP

## What must remain true

Worldline ticks must be appended in causal order and never
rewritten.

## Why it matters

A tick is a causal boundary — the point at which structural state
may lawfully differ from the prior worldline position. If tick
order can wobble, the "history of structure" becomes unreliable.
Materialization depends on deterministic replay in causal order.

## How to check

- Commit-level indexing produces a strictly increasing tick sequence
- Re-indexing does not reorder prior ticks
- Lazy backfill preserves commit topological order
- Lamport timestamps in patches are monotonically increasing
