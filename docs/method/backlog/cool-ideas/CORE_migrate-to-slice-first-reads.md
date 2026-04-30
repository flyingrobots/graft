---
title: "Migrate remaining full-scan reads to slice-first APIs"
feature: projection
kind: trunk
legend: CORE
lane: cool-ideas
release_scope: post-v0.7.0
blocked_by_external:
  - "git-warp observer geometry ladder (Rung 2-4)"
requirements:
  - "git-warp observer geometry ladder Rung 2-4 APIs"
acceptance_criteria:
  - "No getNodes() or getEdges() on broad observer apertures in src/"
  - "All graph reads use traverse, query, or bounded neighborhood APIs"
---

# Migrate remaining full-scan reads to slice-first APIs

Source: non-streaming API audit during CORE_rewrite-structural-queries
(2026-04-21)

## Release Scope

This is no longer active v0.7.0 blocking scope. The high-risk read paths
were mitigated during the v0.7.0 WARP rewrite work. The remaining
medium-risk sweep is externally blocked on git-warp observer geometry
APIs and should be pulled after v0.7.0 when those APIs exist.

## Problem

Several call sites assume the full graph fits in memory by calling
`getNodes()` or `getEdges()` on broad observer apertures. These are
whole-graph reads disguised as local questions.

## Remaining call sites

### getEdges() — full edge scan

| File | Line | Context | Severity |
|------|------|---------|----------|
| `src/cli/local-history-dag-model.ts` | 423 | Renders local history DAG | MEDIUM — bounded by local history size |
| `src/mcp/persisted-local-history.ts` | 488 | Walks local history events | MEDIUM — bounded by local history size |

### getNodes() — full node scan

| File | Line | Context | Severity |
|------|------|---------|----------|
| `src/warp/dead-symbols.ts` | 81, 120, 121 | Compares commit/symbol sets for dead-symbol detection | MEDIUM — bounded by indexed history but still materializes visible node sets |
| `src/warp/index-head.ts` | 186, 194 | Prior-state reconciliation around HEAD indexing | MEDIUM — index-time only, but reads prior/commit node sets |
| `src/warp/symbol-timeline.ts` | 77, 119 | Builds per-symbol timeline across commits | MEDIUM — bounded by query scope, but still materializes matching node sets |
| `src/mcp/persisted-local-history.ts` | 469 | Reads local history nodes | MEDIUM — bounded by local history size |
| `src/cli/local-history-dag-model.ts` | 416 | Renders local history DAG | MEDIUM — bounded by local history size |

## Upstream dependency

git-warp's observer geometry architecture ladder (design doc 0035)
plans slice-first read surfaces at Rung 2-4:

- **Rung 2**: entity-at-coordinate, interval-diff, bounded neighborhood
- **Rung 4**: causal indexes for entity-local discovery without graph-size cost
- **Rung 5**: support fragment reuse instead of full materialization

When these land, graft should migrate the HIGH-severity call sites
first, then sweep the rest.

## Interim mitigations already applied

- `structural-queries.ts`: `getEdges()` replaced with `traverse.bfs`
  + `QueryBuilder` (CORE_rewrite-structural-queries, 2026-04-21)
- `structural-queries.ts`: `detectRemovals` full scan replaced with
  tick receipts (2026-04-21)
- `references.ts`: `getEdges()` replaced with `traverse.bfs` +
  `QueryBuilder` (CORE_references-getEdges-fix)
- `precision-warp.ts`: `getNodes()` + per-node prop reads replaced with
  query API access (CORE_migrate-to-slice-first-reads)

## What to do now

The immediate high-risk call sites have been mitigated. The remaining
work is a post-v0.7.0 bounded sweep of medium-risk call sites after
git-warp's observer geometry ladder exposes the needed slice-first APIs.

Effort: M (remaining sweep when upstream lands)
