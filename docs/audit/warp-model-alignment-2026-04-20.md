# WARP Model Alignment Audit — 2026-04-20

## Context

The data model fundamentally changed this session:

- **Old**: Walk git history commit-by-commit, diff outlines, emit per-commit patches with `adds`/`removes`/`changes` edges. Manual history tracking in application code.
- **New**: Index only HEAD. Full CST + cross-file edges in one atomic patch. WARP handles history natively (ticks, worldlines, temporal queries, provenance slicing).

Additionally, git-warp exposes capabilities graft never used:
- `QueryBuilder` — `match().where().outgoing().incoming().aggregate().run()`
- `LogicalTraversal` — BFS, DFS, shortest path, topological sort, reachability
- `Worldline` — time-travel reads, seek to any tick
- `ProvenanceIndex` — per-node causal cone slicing

The `WarpHandle` port only exposes 5 methods, hiding all of the above.

---

## Findings

### REMOVE

| Module | What it does now | Why it's wrong |
|--------|-----------------|----------------|
| `src/warp/indexer.ts` | Walks git commits, diffs per commit | Reimplements WARP's native history |
| `src/warp/indexer-git.ts` | `listCommits`, `prepareChange`, commit enumeration | Only needed by the old indexer |
| `src/warp/indexer-graph.ts` | Per-commit sym: emission with `adds`/`removes`/`changes` edges | Replaced by `indexHead` + `emitSymNodes` |
| `src/warp/indexer-model.ts` | `PreparedChange` type, commit-walking types | Only needed by the old indexer |
| `src/warp/reference-count.ts` | Ripgrep/grep subprocess for symbol references | Replaced by WARP graph queries |
| `src/warp/symbol-identity.ts` | Canonical identity assignment across commits | Unnecessary — WARP provenance handles identity |

### REWRITE (operations that assume per-commit model)

| Module | Current approach | Should become |
|--------|-----------------|---------------|
| `src/operations/structural-log.ts` | Walks git log SHAs, calls `querySymbols(sha)` per commit | `worldline().backward()` temporal query |
| `src/operations/structural-churn.ts` | Iterates commits, accumulates symbol change counts manually | `query().match(sym:*).aggregate({count})` |
| `src/operations/structural-blame.ts` | Pre-computed per-symbol/per-commit metadata | `worldline().provenance(symbolId)` — last touch |
| `src/warp/structural-queries.ts` | Manual observer + edge walking to reconstruct history | Thin wrappers over `query()` and `traverse` |
| `src/operations/structural-review.ts` | Uses `countSymbolReferences` (grep) for impact | `query(sym).incoming("references").count()` |

### EXPAND (the port is too thin)

| Module | What's exposed | What's missing |
|--------|---------------|----------------|
| `src/ports/warp.ts` | `patch()`, `observer()`, `hasNode()`, `materialize()` | `query()`, `traverse`, `worldline()`, `provenanceSlice()`, `getEdgeProps()` |

### ENHANCE (works but misses new capabilities)

| Module | What it could gain |
|--------|-------------------|
| `src/operations/graft-diff.ts` | Cross-file impact analysis via incoming reference edges |
| `src/operations/export-surface-diff.ts` | Reference tracking to distinguish "used export" from "dead export" |
| `src/warp/references.ts` | Use `QueryBuilder` instead of manual observer iteration; add temporal parameter |
| `src/mcp/tools/precision-warp.ts` | Use `QueryBuilder` for symbol search instead of observer-based loop |

### UPDATE (production callers of deprecated code)

| Module | Change needed |
|--------|--------------|
| `src/cli/index-cmd.ts` | Switch from `indexCommits` to `indexHead`; deprecate `--from` flag |
| `src/mcp/monitor-tick-job.ts` | Switch from `indexCommits` to `indexHead`; simplify commit tracking |

### OK (no changes needed)

| Module | Why it's fine |
|--------|--------------|
| `src/warp/ast-emitter.ts` | Correct, used by `indexHead` |
| `src/warp/ast-import-resolver.ts` | Correct, used by `indexHead` |
| `src/warp/index-head.ts` | Correct direction (needs minor enrichment: HEAD metadata node) |
| `src/warp/open.ts` | Works, just needs to expose more of WarpApp |
| `src/warp/writer-id.ts` | Still valid for multi-writer provenance |

---

## Critical Pattern

**Every file that calls `opts.querySymbols(sha)` or walks commits is an anti-pattern now.**

The old model embedded history logic in application code. The new model:
- **Ticks** replace manual commit tracking
- **Worldlines** replace git log iteration
- **Temporal queries** replace per-commit callbacks
- **Provenance index** replaces application-level parent tracking
- **QueryBuilder** replaces manual graph traversal

---

## Recommended execution order

1. **Widen the port** — Expose `query()`, `traverse`, `worldline()` on WarpHandle
2. **Remove reference-count.ts** — Replace callers with WARP queries (structural-review)
3. **Remove the old indexer** — Delete indexer.ts, indexer-git.ts, indexer-graph.ts, indexer-model.ts
4. **Update CLI + monitor** — Switch to indexHead
5. **Rewrite structural-queries.ts** — Thin wrappers over QueryBuilder/worldline
6. **Rewrite structural-log** — Temporal worldline query
7. **Rewrite structural-churn** — Aggregate query
8. **Rewrite structural-blame** — Provenance query
9. **Enhance structural-review** — WARP edge counting for impact
10. **Enhance graft-diff + export-surface-diff** — Cross-file impact edges
