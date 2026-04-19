---
title: "Structural churn report"
legend: WARP
lane: up-next
blocked_by:
  - WARP_commit-symbol-query-helpers
---

# Structural churn report

Which symbols change most frequently? High-churn symbols are
maintenance hotspots. Count `changes` edges per symbol across
the worldline.

## Surfaces

- **CLI**: `graft churn [--path PATH] [--limit N]`
- **MCP**: `graft_churn` tool

## Core operation

`src/operations/structural-churn.ts`:
- Input: optional path filter, limit
- Output: ranked list of symbols by change frequency, with files and last-changed commit

## Depends on

- WARP_commit-symbol-query-helpers
