---
title: "Migrate remaining full-scan reads to slice-first APIs"
legend: CORE
lane: v0.7.0
blocked_by_external:
  - "git-warp observer geometry ladder (Rung 2-4)"
---

# Migrate remaining full-scan reads to slice-first APIs

Source: non-streaming API audit during CORE_rewrite-structural-queries
(2026-04-21)

## Problem

Several call sites assume the full graph fits in memory by calling
`getNodes()` or `getEdges()` on broad observer apertures. These are
whole-graph reads disguised as local questions.

## Remaining call sites

### getEdges() — full edge scan

| File | Line | Context | Severity |
|------|------|---------|----------|
| `src/warp/references.ts` | 30 | Scans all `ast:*+file:*+sym:*` edges to find `references` edges | HIGH — should be `traverse.bfs(targetId, { dir: 'in', labelFilter: 'references' })` |
| `src/cli/local-history-dag-model.ts` | 423 | Renders local history DAG | MEDIUM — bounded by local history size |
| `src/mcp/persisted-local-history.ts` | 488 | Walks local history events | MEDIUM — bounded by local history size |

### getNodes() — full node scan

| File | Line | Context | Severity |
|------|------|---------|----------|
| `src/warp/identity-resolver.ts` | 20 | Scans sym nodes for one file | LOW — scoped to `sym:<file>:*` |
| `src/warp/indexer-graph.ts` | 21, 42 | Reads commit/sym nodes | LOW — scoped to narrow lenses |
| `src/mcp/tools/precision-warp.ts` | 41, 79 | Searches WARP symbols | HIGH — scans `commit:*` or broad sym apertures |
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

## What to do now

- `references.ts` line 30: replace `getEdges()` with `traverse.bfs`
  immediately — no upstream dependency, same pattern as structural-queries
- All others: wait for git-warp Rung 2+ APIs

Effort: S (references.ts now) + M (rest when upstream lands)
