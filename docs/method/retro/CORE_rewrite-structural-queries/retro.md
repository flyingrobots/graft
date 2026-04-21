---
title: "Retro: CORE_rewrite-structural-queries"
cycle: "CORE_rewrite-structural-queries"
conclusion: "pass"
---

# Retro: CORE_rewrite-structural-queries

## Conclusion: PASS

Replaced `getEdges()` scalability bug with substrate-side operations.
`traverse.bfs` for edge-following, `QueryBuilder` for pattern matching
and batch prop reads. Same public API, same behavior, no memory
assumptions about edge count.

## What went well

- **Right primitive for each job.** traverse.bfs for edge walks
  (semantically correct — this IS traversal), QueryBuilder for pattern
  matching and batch prop reads (returns inline props, no round-trips).
- **Existing tests caught a real bug.** QueryBuilder's `incoming()`
  deduplicates destination nodes — so `commitsForSymbol` with a glob
  pattern collapsed two results into one. Per-sym-node traversal
  preserves the 1:1 edge→result cardinality.
- **Schema tests caught a missing guard.** `traverse.bfs` throws
  `TraversalError` when the start node doesn't exist. The old
  `getEdges()` approach silently returned no matches. Added `hasNode`
  guard before traversal.

## What drifted

- Design said "use QueryBuilder with outgoing/incoming." Implementation
  uses traverse.bfs for edge-following and QueryBuilder only for pattern
  matching + batch reads. James corrected: edge-following is traversal,
  not pattern matching.
- Design didn't anticipate the incoming() dedup issue or the
  TraversalError on missing start nodes.

## What to watch

- `detectRemovals` still does a full `query().match("sym:*")` scan at
  two ceilings. This is bounded by the total number of symbols in the
  graph. If the graph grows very large, this may need a more targeted
  approach (e.g. subscribe/StateDiff between ticks).
- When `deprecate-index-commits` removes commit:sha nodes, these
  functions become dead code. The pattern (traverse + query) survives
  into whatever replaces them.

## Follow-on backlog items

None added. Next on the critical path: `CORE_deprecate-index-commits`.
