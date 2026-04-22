---
title: "Dead symbol detection"
feature: structural-metrics
kind: trunk
legend: WARP
lane: cool-ideas
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Commit→sym adds/changes/removes edges (shipped via indexHead reconciliation)"
acceptance_criteria:
  - "A command lists symbols removed in the last N commits that were never re-added"
  - "Dead symbols are identified via WARP graph edges: a 'removes' edge with no subsequent 'adds' edge for the same symbol"
  - "Output is usable for cleanup candidates, deprecation tracking, and API surface shrinkage analysis"
  - "The query runs against the WARP graph without requiring a full repo scan"
  - "A test verifies that a symbol removed and not re-added across commits appears in the dead symbol list"
---

# Dead symbol detection

Symbols removed and never re-added are dead. The WARP graph knows
this — a `removes` edge with no subsequent `adds` edge for the
same symbol name.

"Show me symbols removed in the last N commits" — cleanup
candidates, deprecation tracking, API surface shrinkage.

## Implementation path

The infrastructure already exists. `indexHead` emits commit→sym
edges labeled `adds`, `changes`, or `removes` via prior-state
reconciliation (shipped in CORE_deprecate-index-commits).
`structural-queries.ts` already has `commitChanges()` that reads
these edges. The new feature is a query that:

1. Walks commit nodes in reverse chronological order
2. Collects all `removes` edges
3. Filters out any symbol that has a later `adds` edge

This is purely a WARP graph traversal — no file I/O, no grep.

## Related cards

- **WARP_symbol-history-timeline**: Shares infrastructure (both
  walk commit→sym edges) but neither requires the other. Timeline
  shows every version; dead-symbol shows only the permanently removed.
- **WARP_auto-breaking-change-detection**: Dead *exported* symbols
  are breaking changes. This card provides the "removed symbol"
  detection that breaking-change-detection needs. **Hard blocker.**
- **WARP_codebase-entropy-trajectory**: Could consume dead-symbol
  rates as an entropy signal, but entropy has its own prerequisites
  (structural churn report). Not a hard dependency.

## Effort rationale

Small. It's a query over existing graph data — no new indexing,
no new edge types, no new infrastructure. The hardest part is
defining "last N commits" when the worldline may have branches.
