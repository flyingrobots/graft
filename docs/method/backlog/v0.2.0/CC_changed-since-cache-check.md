# changed-since uses manual hash instead of cache.check()

`changed-since.ts` calls `ctx.cache.get()` then manually compares
`obs.contentHash === hashContent(rawContent)` instead of using
`ctx.cache.check()` which encapsulates the same logic.

## Location

- `src/mcp/tools/changed-since.ts` lines 37-49

## Why it matters

The manual comparison duplicates the abstraction in ObservationCache.
If check() logic changes (e.g., hash algorithm), changed-since won't
pick it up.

## Fix

Replace `ctx.cache.get()` + manual hash compare with `ctx.cache.check()`,
then branch on the discriminated union result.

## Legend

CLEAN_CODE
