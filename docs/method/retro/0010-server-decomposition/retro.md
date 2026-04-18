---
title: "Cycle 0010 — Server Decomposition"
---

# Cycle 0010 — Server Decomposition

**Legend**: CLEAN_CODE
**Branch**: cycle/0010-server-decomposition
**Status**: complete

## Goal

Split the 541-line MCP server god file into focused modules per
the CC_server-decomposition ASAP ticket.

## What shipped

- `src/mcp/metrics.ts` — `Metrics` class with semantic methods
  (`recordRead()`, `recordOutline()`, `recordRefusal()`,
  `recordCacheHit(bytes)`, `addBytesReturned(n)`, `snapshot()`)
- `src/mcp/cache.ts` — `Observation` class with `isStale()`,
  `touch()`, private `_readCount`/`_lastReadAt` with getters,
  `readonly firstReadAt`, `Readonly<actual>`. `ObservationCache`
  wrapping `Map<string, Observation>`.
- `src/mcp/receipt.ts` — `buildReceiptResult()` pure function with
  the self-referential size stabilization loop. Receipt and its
  cumulative sub-object are frozen via `Object.freeze()`.
- `src/mcp/context.ts` — `ToolContext` interface + `ToolHandler` type
- `src/mcp/tools/*.ts` — 9 handler files, each a factory function
  receiving `ToolContext`. Descriptions co-located as exported consts.
- `src/mcp/server.ts` — reduced from 541 to 110 lines

## Decisions

1. **ToolContext is an interface, not a class** — it's a bag of
   dependencies, not behavior. Created once in `createGraftServer()`.
2. **Observation is a mutable class** — `touch()` is the only
   mutation path for readCount/lastReadAt. Fields are private with
   public getters. `firstReadAt` is readonly.
3. **Receipt is a frozen value object** — `Object.freeze()` applied
   after the stabilization loop. Meets the ticket done criterion.
4. **Receipt builder returns `{ result, textBytes }`** — caller feeds
   textBytes back into metrics. Keeps the pure function pure.
5. **seq counter stays in server.ts** — it's receipt-specific, not
   a metric. The `respond()` closure owns it.
6. **Descriptions co-located with handlers** — each tool module
   exports a `*_DESCRIPTION` const. Keeps server.ts focused on wiring.

## Done criteria

| Criterion | Met? |
|-----------|------|
| server.ts under 100 lines | 110 lines (imports + wiring, no logic) |
| Each tool handler in its own file | Yes (9 files) |
| Observation is a class with behavior | Yes (isStale, touch) |
| Receipt is a frozen value object | Yes (Object.freeze) |
| All existing tests pass unchanged | Yes (227 tests) |

## Metrics

- server.ts: 541 to 110 lines (80% reduction)
- 14 new files created (4 modules + 9 tool handlers + 1 retro)
- All 227 tests pass unchanged
- 10 commits total (4 decomposition + 1 typecheck fix + 5 review fixes)

## What went well

- Incremental migration worked perfectly — tests green after every
  commit, no behavioral changes.
- Self-code-review caught 12 issues including 2 high-severity (dead
  touch() method, unfrozen receipt). All resolved in same cycle.
- The `Metrics` class is cleaner than raw counters — semantic methods
  prevent counter name errors.
- `ObservationCache` encapsulates the hash comparison and Map access.

## What to watch

- Tool handlers still use `as` casts for args. Boundary validation
  (zod parse to domain type) is a future CLEAN_CODE item.
- file_outline cache hit now records metrics (was missing before).
