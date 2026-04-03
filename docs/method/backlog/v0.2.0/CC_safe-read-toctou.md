# safe-read TOCTOU race between rawContent and safeRead

`rawContent` is read synchronously for cache checking, then `safeRead()`
re-reads the file asynchronously. If the file changes between these
two reads, the hash cached from `rawContent` won't match what safeRead
actually processed.

## Location

- `src/mcp/tools/safe-read.ts` lines 17-22 (rawContent read)
  vs lines 103-107 (safeRead call)

## Impact

Low — the race window is tiny (same process, microseconds). The worst
case is a cache entry with a slightly stale hash, which self-corrects
on the next read when the hash mismatches.

## Fix options

1. Have safeRead return the raw content it read, use that for hashing
2. Pass rawContent into safeRead to avoid the double-read
3. Accept the race (document the known limitation)

Option 2 is cleanest — it also avoids the redundant disk read.

## Legend

CLEAN_CODE
