---
title: "Cross-repo structural dependency tracking"
---

# Cross-repo structural dependency tracking

Two repos both use WARP. "Did my dependency change its export
surface since I pinned it?"

Compare export surface observers across repos. Detect API
incompatibility BEFORE npm install. A library changes an exported
signature → every consumer's WARP graph detects the break.

Depends on: WARP Level 1 (shipped), export surface diff (backlog),
cross-repo observer comparison.
