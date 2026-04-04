# String matching on projection/reason in tool handlers

SSJS P3 violation. Tool handlers switch on `projection` and
`reason` string values instead of using instanceof dispatch on
PolicyResult subclasses. The policy engine already returns typed
classes (ContentResult, OutlineResult, RefusedResult) — the tool
handlers should dispatch on those, not re-parse the string.

## Files

- `src/mcp/tools/safe-read.ts` — checks `result.projection`
- `src/mcp/tools/changed-since.ts` — checks `result.projection`
- `src/operations/safe-read.ts` — already uses instanceof (good)

## Fix

Replace `if (result.projection === "content")` with
`if (result instanceof ContentResult)` in tool handler layers,
matching the pattern already used in operations/safe-read.ts.

Effort: S
