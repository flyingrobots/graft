---
title: "Rewrite structural-queries to use WARP native operations"
legend: "CORE"
cycle: "CORE_rewrite-structural-queries"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-structural-queries.md"
---

# Rewrite structural-queries to use WARP native operations

Source backlog item: `docs/method/backlog/v0.7.0/CORE_rewrite-structural-queries.md`
Legend: CORE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

By the end of this cycle, `structural-queries.ts` uses git-warp's
`QueryBuilder` for graph traversal instead of manually filtering edge
arrays. Same public API, same return types, same behavior — just a
cleaner internal implementation that uses the substrate's native
query capabilities.

## Rationale

The current implementation:
1. Creates an observer with a wide lens (`commit:* + sym:*`)
2. Calls `getEdges()` to pull ALL edges into memory
3. Manually loops and filters by `edge.from`, `edge.to`, `edge.label`
4. Then reads node props one-by-one

git-warp's `QueryBuilder` does this in a single fluent call:
```typescript
observer.query()
  .match("commit:<sha>")
  .outgoing("adds")
  .select(["id", "props"])
  .run()
```

The traversal and filtering happen inside the substrate where it can
optimize. Less code, same semantics.

## Design

### symbolsForCommit(ctx, sha) → CommitSymbols

**Current:** observer lens → getEdges() → manual filter → readSymbolChange per node
**New:**

```typescript
const obs = await observeGraph(ctx, commitSymbolLens());

// Added symbols: commit → adds → sym:*
const addedResult = await obs.query()
  .match(`commit:${commitSha}`)
  .outgoing("adds")
  .select(["id", "props"])
  .run();

// Changed symbols: commit → changes → sym:*
const changedResult = await obs.query()
  .match(`commit:${commitSha}`)
  .outgoing("changes")
  .select(["id", "props"])
  .run();
```

Each result's `nodes` array has `{ id, props }` — no per-node
`getNodeProps()` round-trips.

**Removals** stay as a tick-diff (two observers at ceiling N-1 and N).
This is the correct WARP pattern — removals delete the sym node, so
there's no edge to query. The diff approach is already clean. But we
can use `QueryBuilder.match("sym:*").select(["id"])` instead of
`getNodes()` to keep the query style consistent.

### commitsForSymbol(ctx, name, path?) → SymbolHistory

**Current:** observer lens → getEdges() → manual filter by sym name suffix → read props
**New:**

```typescript
const obs = await observeGraph(ctx, commitSymbolLens());

// Find matching symbol node IDs first
const symPattern = filePath !== undefined
  ? `sym:${filePath}:${symbolName}`
  : `sym:*:${symbolName}`;

// All commits that touched this symbol, via incoming edges
const result = await obs.query()
  .match(symPattern)
  .incoming("adds")
  .select(["id", "props"])
  .run();
```

Run three queries (one per edge label: adds, removes, changes) and
merge results with the appropriate `ChangeKind`.

### detectRemovals (private)

Stays as tick-ceiling diff. Use `query().match("sym:*").select(["id"])`
at each ceiling instead of `getNodes()` for consistency, but the
approach is unchanged.

### What doesn't change

- Public types: `SymbolChange`, `CommitSymbols`, `ChangeKind`,
  `SymbolCommit`, `SymbolHistory`
- Public function signatures: `symbolsForCommit(ctx, sha)`,
  `commitsForSymbol(ctx, name, path?)`
- Internal helpers: `filePathFromSymId`, `commitSymbolLens`
- The observers module (`observe`, lens factories)

## Playback Questions

### Human

- [ ] Can a human confirm the public API surface is unchanged (same
      exports, same types, same behavior)?
- [ ] Can a human see that manual edge-filter loops have been replaced
      with QueryBuilder calls?

### Agent

- [ ] Do all existing structural-queries tests pass without changes?
- [ ] Do all downstream consumers (structural-log, structural-blame,
      structural-churn) still pass?
- [ ] Does `pnpm lint` pass with zero warnings?

## Test Plan

### Golden path

1. **Existing tests pass unchanged** — the 5 structural-queries tests
   are the spec. They must pass with zero modifications.
2. **Downstream operations pass** — structural-log (7 tests),
   structural-blame (5 tests), structural-churn (6 tests) all green.
3. **Full suite green** — no regressions.

### Edge cases

- Single-commit repo (no tick-1 for removals) — covered by existing
  `returns added symbols` test.
- Symbol with `:` in the path — covered by `filePathFromSymId` which
  splits at last colon.
- No matching symbols for `commitsForSymbol` — must return empty commits
  array (existing `filters by filePath` test covers this implicitly).

### Known failure modes

- `QueryBuilder.outgoing()` may not filter by target node prefix
  (`sym:*`). If it returns non-sym nodes, add a `.where()` predicate.
  Existing tests will catch this.

## Drift risk

- If `QueryBuilder.run()` returns a different shape than expected
  (`QueryResultV1`), the node-to-SymbolChange mapping will break.
  Tests will catch this immediately.
