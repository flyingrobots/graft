---
title: "Export surface diff"
legend: WARP
lane: up-next
blocked_by:
  - WARP_symbol-reference-counting
---

# Export surface diff

"What changed in the public API between two refs?"

Filter to exported symbols only, compare at two worldline positions.
Shows added exports, removed exports, and changed signatures.

API changelog generator. Breaking change detector. Pairs naturally
with semver: new exports = minor, removed = major, changed = check.

## Depends on

- WARP_symbol-reference-counting (for impact analysis)
- code_find (shipped)
- graft_diff (shipped)
