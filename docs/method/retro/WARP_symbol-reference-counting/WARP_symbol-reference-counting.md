---
title: "symbol-reference-counting"
cycle: "WARP_symbol-reference-counting"
design_doc: "docs/design/WARP_symbol-reference-counting.md"
outcome: hill-met
drift_check: no
---

# symbol-reference-counting Retro

## Summary

Shipped countSymbolReferences with ripgrep. Gaps: ARG_MAX risk on large repos, no search method attribution.

## Closure note

Built as part of v0.7.0 structural history batch. Design doc written
retroactively. Gap analysis identified defects filed as bad-code cards.
Closing as part of bulk method drift operation.
