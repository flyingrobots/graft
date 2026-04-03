# Double-cast in tool handlers

Several tool handlers use `result as unknown as Record<string, unknown>`
to pass operation results to `ctx.respond()`. This erases type safety
entirely.

## Locations

- `src/mcp/tools/safe-read.ts` (line ~122)
- `src/mcp/tools/file-outline.ts` (line ~48)
- `src/mcp/tools/read-range.ts` (line ~10)
- `src/mcp/tools/graft-diff.ts` (line ~17)

## Root cause

`respond()` accepts `Record<string, unknown>` but operation functions
return typed result objects. The cast bridges the gap unsafely.

## Fix options

1. Make `respond()` generic: `respond<T extends Record<string, unknown>>(tool, data: T)`
2. Define a union type for all operation results that extends `Record<string, unknown>`
3. Add index signatures to operation result types

Option 2 is the cleanest — it preserves type safety at the call site
while keeping `respond()` simple.

## Legend

CLEAN_CODE
