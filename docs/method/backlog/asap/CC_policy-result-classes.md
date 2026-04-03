# PolicyResult class hierarchy

Highest-impact migration. Replace the `PolicyResult` interface and
string-tag switching with runtime-backed classes.

## Classes

- `ContentResult` — file returned as content (small enough)
- `OutlineResult` — file exceeded threshold, returns outline
- `RefusedResult` — file banned, returns reason + next steps
- `ErrorResult` — file not found, permission denied, etc.
- `CacheHitResult` — re-read of unchanged file
- `DiffResult` — file changed since last read

Each is a frozen class with constructor validation. Dispatch via
`instanceof` replaces `if (result.projection === "...")`.

## Files touched

- `src/policy/types.ts` — replace interfaces with classes
- `src/policy/evaluate.ts` — return class instances
- `src/operations/safe-read.ts` — instanceof dispatch
- `src/mcp/server.ts` — instanceof dispatch in tool handlers

## Done criteria

- [ ] Zero `projection === "string"` comparisons in source code
- [ ] All result classes are `Object.freeze`d
- [ ] All existing tests still pass (no behavior change)

See: audit Phase 1. Effort: M
