---
title: "Dead symbol detection"
---

# Dead symbol detection

Symbols removed and never re-added are dead. The WARP graph knows
this — a `removes` edge with no subsequent `adds` edge for the
same symbol name.

"Show me symbols removed in the last N commits" — cleanup
candidates, deprecation tracking, API surface shrinkage.

Depends on: WARP Level 1 (shipped).
