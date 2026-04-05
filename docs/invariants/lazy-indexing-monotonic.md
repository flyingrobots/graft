# Invariant: Lazy Indexing Is Monotonic

**Status:** Planned
**Legend:** WARP

## What must remain true

Lazy indexing may defer work, but once a queried range is indexed,
repeated queries over the same range must not regress to
"unindexed."

## Why it matters

Lazy indexing is the right Level 1 choice — no hooks, no install
friction. But it needs a monotone progress guarantee. If the system
"forgets" what it already indexed, queries feel haunted and
performance is unpredictable.

## How to check

- Index a commit range via lazy query
- Query the same range again
- Second query must not re-index (verify via patch count or timing)
- Explicit re-index is a separate operation, not a side effect
