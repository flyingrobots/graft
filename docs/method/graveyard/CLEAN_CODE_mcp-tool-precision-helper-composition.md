---
title: Precision helper still carries too many responsibilities
lane: graveyard
legend: CLEAN
---

# Precision helper still carries too many responsibilities

## Disposition

Retired by consolidation into the shared symbol-query and precision seam. The remaining debt is a common execution-strategy/orchestration problem across symbol query and precision helpers.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_symbol-query-and-precision-tool-seams.md`

## Original Proposal

File: `src/mcp/tools/precision.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- SOLID 🟡

What is wrong:
- the shared precision helper still mixes repo path normalization, git
  ref resolution, historical file listing, content loading, live/WARP
  search execution, symbol collection, and range helpers

Desired end state:
- split the helper into smaller modules with clearer contracts for
  repo/ref utilities, symbol collection, precision execution, and
  content loading

Effort: M
