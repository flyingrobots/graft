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
- `src/mcp/cache.ts` — `Observation` class (mutable entity with
  `isStale()`, `touch()`) + `ObservationCache` class wrapping
  `Map<string, Observation>`
- `src/mcp/receipt.ts` — `buildReceiptResult()` pure function with
  the self-referential size stabilization loop
- `src/mcp/context.ts` — `ToolContext` interface + `ToolHandler` type
- `src/mcp/tools/*.ts` — 9 handler files, each a factory function
  receiving `ToolContext`
- `src/mcp/server.ts` — reduced from 541 → 121 lines

## Decisions

1. **ToolContext is an interface, not a class** — it's a bag of
   dependencies, not behavior. Created once in `createGraftServer()`.
2. **Observation is a mutable class** — it has `touch()` to update
   readCount/lastReadAt. Not frozen, because it's a stateful entity.
3. **Receipt builder returns `{ result, textBytes }`** — caller feeds
   textBytes back into metrics. Keeps the pure function pure.
4. **seq counter stays in server.ts** — it's receipt-specific, not
   a metric. The `respond()` closure owns it.
5. **Steps 4+5 collapsed** — ToolContext and tool extraction done
   together since the unused `ctx` variable would fail lint.

## Metrics

- server.ts: 541 → 121 lines (78% reduction)
- 14 new files created (4 modules + 9 tool handlers + 1 retro)
- All 227 tests pass unchanged
- 4 commits (planned 6, collapsed 4+5 and skipped final cleanup)

## What went well

- Incremental migration worked perfectly — tests green after every
  commit, no behavioral changes.
- The `Metrics` class is cleaner than raw counters — semantic methods
  prevent counter name errors.
- `ObservationCache` encapsulates the hash comparison and Map access.

## What to watch

- 121 lines is above the 100-line ticket target. The excess is tool
  descriptions (content, not logic). Acceptable.
- Tool handlers still use `as` casts for args. Boundary validation
  (zod parse → domain type) is a future CLEAN_CODE item.
