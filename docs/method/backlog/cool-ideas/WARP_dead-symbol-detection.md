---
title: "Dead symbol detection"
requirements:
  - "WARP Level 1 indexing (shipped)"
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

Depends on: WARP Level 1 (shipped).
