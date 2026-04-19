---
title: "graft review — zero-noise structural PR review"
legend: SURFACE
lane: up-next
blocked_by:
  - WARP_symbol-reference-counting
---

# graft review — zero-noise structural PR review

Separate structural signal from formatting noise in PRs. Detect breaking changes automatically.

## Surfaces

- **CLI**: `graft review [base] [head]` — formatted terminal output
- **MCP**: `graft_review` tool — JSON structured output

## Core operation

`src/operations/structural-review.ts`:
- Input: base..head ref range
- Output: files categorized (structural/formatting/test), breaking changes flagged, impact per breaking change
- Uses graft_diff (shipped) for structural diff
- Uses symbol reference counting for impact analysis
- Uses export detection for breaking change flagging

## Depends on

- WARP_symbol-reference-counting
- graft_diff (shipped)
