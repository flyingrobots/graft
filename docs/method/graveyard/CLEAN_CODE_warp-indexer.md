---
title: WARP indexer is a major architecture hotspot
lane: graveyard
legend: CLEAN
---

# WARP indexer is a major architecture hotspot

## Disposition

Retired after splitting WARP indexing into focused git, graph, and model modules with a thin orchestration root in src/warp/indexer.ts.

## Original Proposal

File: `src/warp/indexer.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🔴

What is wrong:
- one file owns git commit traversal, file loading, parser extraction, diff patch construction, and WARP write orchestration
- shell/git interaction and structural patch logic are not cleanly separated

Desired end state:
- split commit enumeration, file-state loading, patch derivation, and graph-writing into smaller units
- promote key patch artifacts to stronger runtime-backed types

Effort: XL
