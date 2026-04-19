---
title: "Structural blame"
legend: WARP
lane: up-next
blocked_by:
  - WARP_commit-symbol-query-helpers
  - WARP_symbol-reference-counting
---

# Structural blame

"Who last changed this function's signature?" Not line-level
blame — structural blame. Which commit changed the signature of
evaluatePolicy? Which commit added this class?

## Surfaces

- **CLI**: `graft blame <symbol> [--path PATH]` — formatted output
- **MCP**: `graft_blame` tool — JSON structured output

## Core operation

`src/operations/structural-blame.ts`:
- Input: symbol name, optional file path
- Output: creation commit, last signature change, full change history, reference count
- Uses WARP commit-symbol query helpers for reverse traversal
- Uses symbol reference counting for impact

## Depends on

- WARP_commit-symbol-query-helpers
- WARP_symbol-reference-counting
