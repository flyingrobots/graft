---
title: "graft log — structural git history"
legend: SURFACE
lane: up-next
blocked_by:
  - WARP_commit-symbol-query-helpers
---

# graft log — structural git history

Per-commit structural changelog: symbols added, removed, and changed.

## Surfaces

- **CLI**: `graft log [--since REF] [--path PATH]` — formatted terminal output
- **MCP**: `graft_log` tool — JSON structured output

## Core operation

`src/operations/structural-log.ts`:
- Input: ref range, optional path filter
- Output: array of `{ sha, author, date, message, symbols: { added, removed, changed } }`
- Uses WARP commit-symbol query helpers

## Depends on

- WARP_commit-symbol-query-helpers
