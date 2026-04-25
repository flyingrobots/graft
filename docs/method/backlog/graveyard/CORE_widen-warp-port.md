---
title: "Widen WarpHandle port to expose query/traverse/worldline"
legend: CORE
lane: graveyard
blocks:
  - CORE_deprecate-index-commits
  - CORE_rewrite-structural-queries
---

# Replace WarpHandle with direct git-warp usage

Source: WARP model alignment audit + design discussion (2026-04-20)

## Decision

Kill the WarpHandle port abstraction. Import from `@git-stunts/git-warp`
directly. Use WarpApp, Observer, Worldline, QueryBuilder as-is.

## Architecture

- One `WarpApp` per repo (opened once, injected via DI)
- One writer per repo (single agent for now — error if second tries to bind)
- No strands yet (git-warp strand merging not ready)
- Everything on primary worldline
- Functions take what they need: WarpApp for writes, Observer/Worldline for reads

## DI context

```typescript
interface WarpContext {
  app: WarpApp;
  writerId: string;
  strandId: null; // future: string for branch-based strands
}
```

Constructed once at MCP server boot / CLI entry. Passed to everything.

## Future (blocked on git-warp strand merge semantics)

- Agent sessions write to strands (between-commit provenance)
- Multiple agents per repo via separate strands
- Strand collapse on merge to main
- Per-branch isolated worldlines

## Work

1. Delete src/ports/warp.ts (the WarpHandle interface)
2. Update openWarp to return WarpApp directly
3. Update all consumers to accept WarpApp / Observer / Worldline
4. Enforce single-agent lock (error on concurrent bind)

Effort: M
