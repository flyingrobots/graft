---
title: "Refactor difficulty score"
cycle: "WARP_refactor-difficulty-score"
design_doc: "docs/design/WARP_refactor-difficulty-score.md"
source_backlog: "docs/method/backlog/v0.7.0/WARP_refactor-difficulty-score.md"
outcome: hill-met
drift_check: yes
---

# Refactor difficulty score Retro

## Summary

The hill was met. Agents can now query a WARP-backed refactor
difficulty score for a symbol through MCP (`graft_difficulty`) or CLI
(`graft symbol difficulty`).

The score is deliberately explainable: curvature is aggregate-backed
churn plus signature instability, friction is WARP reference-edge
fan-in, and the scalar is their product.

This closes the v0.7.0 backlog card by retro/witness, not by a
graveyard tombstone.

## What Shipped

- Added `refactorDifficultyFromGraph()` in
  `src/warp/refactor-difficulty.ts`.
- Added MCP tool `graft_difficulty`.
- Added CLI peer command `graft symbol difficulty <symbol>`.
- Added output schemas and capability matrix entries for the new
  surface.
- Added tests for scoring behavior, duplicate symbol handling, zero
  friction, MCP/CLI schema coverage, and grouped CLI help.
- Updated release docs and downstream backlog cards that depended on
  refactor difficulty.

## Validation

- `pnpm exec vitest run test/unit/warp/refactor-difficulty.test.ts test/unit/contracts/output-schemas.test.ts test/unit/cli/main.test.ts test/unit/mcp/tools.test.ts`
- `git diff --check`
- `pnpm guard:agent-worktrees`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`

## Follow-On Pressure

The score intentionally remains simple. Future structural-risk work can
extend it with temporal debt curvature, grouped aggregate queries, and
policy integration without changing the basic factors agents already
receive.
