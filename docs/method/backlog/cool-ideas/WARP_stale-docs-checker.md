---
title: "Stale docs checker"
---

# Stale docs checker

WARP knows when symbols change. Docs reference symbols by name.
When a referenced symbol's signature changes, the doc is stale.

"README.md mentions evaluatePolicy — but its signature changed
3 commits ago. The docs may be outdated."

Walk docs for symbol references (backtick-quoted names, code
blocks). Cross-reference against WARP worldline. Flag docs
where referenced symbols have changed since the doc was last
modified.

Also: CHANGELOG mentions version numbers. Compare against
package.json. GUIDE mentions tool count. Compare against
TOOL_REGISTRY.length.

Depends on: WARP Level 1 (shipped), graft_since (shipped).
