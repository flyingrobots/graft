# Cycle 0003 — Re-read Suppression

**Type:** Feature
**Legend:** CORE
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

When an agent reads the same file twice in a session and the file
hasn't changed, graft returns a compact "unchanged" response with
the cached outline instead of re-reading and re-parsing. The agent
gets the information it needs without paying the context cost again.

## Empirical basis

Blacklight: WarpGraph.js was read 1,053 times across 85 sessions
for 1.74 GB of context burden. Most re-reads find identical content.
Re-read suppression directly attacks the re-read multiplier.

## Playback questions

### Agent perspective

1. If I safe_read the same file twice without it changing, do I get
   a compact "unchanged" response instead of the full content again?
2. Does the unchanged response include the cached outline and jump
   table so I can still navigate?
3. If the file DID change between reads, do I get the new content
   (or new outline) as normal?
4. Does re-read suppression work for file_outline too?
5. Can I see how many re-reads were suppressed in stats?

### Operator perspective

1. Does the metrics log distinguish suppressed re-reads from fresh
   reads?
2. Can I see the estimated bytes avoided from suppression in stats?

## Non-goals

- **No cross-session persistence.** The cache lives in the MCP
  server's memory. New session = empty cache. Cross-session memory
  is WARP territory (Level 2 observation cache).
- **No file watcher.** Cache invalidation is by content hash on
  next read, not proactive. If a file changes, the next safe_read
  detects it.

## Design

### Observation cache

```typescript
interface Observation {
  contentHash: string;       // SHA-256 of file content
  outline: OutlineEntry[];   // cached outline
  jumpTable: JumpEntry[];    // cached jump table
  actual: { lines: number; bytes: number };
  readCount: number;         // how many times read this session
  firstReadAt: string;       // ISO timestamp
  lastReadAt: string;        // ISO timestamp
}
```

The MCP server maintains `Map<resolvedPath, Observation>` in the
GraftServer instance. Scoped to the server's lifetime (= session).

### Flow

1. Agent calls `safe_read(path)`.
2. Server resolves the path and checks the observation cache.
3. If no cache entry: proceed as normal (read, evaluate policy,
   return result). Record observation.
4. If cache entry exists: hash the current file content.
   - **Hash matches:** return `{ projection: "cache_hit", ... }`
     with cached outline, jump table, readCount, and
     `estimatedBytesAvoided`.
   - **Hash differs:** invalidate cache, proceed as normal,
     record new observation.

### Response shape for cache hits

```typescript
{
  path: string;
  projection: "cache_hit";
  reason: "REREAD_UNCHANGED";
  outline: OutlineEntry[];        // from cache
  jumpTable: JumpEntry[];         // from cache
  actual: { lines: number; bytes: number };
  readCount: number;              // total reads this session
  estimatedBytesAvoided: number;  // bytes NOT re-sent
  lastReadAt: string;
}
```

The agent gets the outline (so it can still navigate) without the
full content. The `estimatedBytesAvoided` field is the raw file
size — what would have been returned without suppression.

### file_outline cache

Same logic. If the file hasn't changed, return the cached outline
directly without re-parsing. Faster and avoids redundant tree-sitter
work.

### Stats integration

`stats` output gains:
- `totalCacheHits` — number of suppressed re-reads
- `totalBytesAvoidedByCache` — cumulative bytes saved

### Metrics logging

Cache hits are logged to the NDJSON log with reason `REREAD_UNCHANGED`
so Blacklight can measure suppression effectiveness.

### Reason code

Add `REREAD_UNCHANGED` to the reason code enum (15 total).

## Test strategy

- `test/unit/mcp/cache.test.ts` — observation cache behavior:
  read → cache → re-read same → cache hit. File changes → cache
  miss. Different files → independent cache entries. readCount
  increments. estimatedBytesAvoided calculation. file_outline
  cache hits.
- Update `test/unit/mcp/tools.test.ts` — stats includes cache
  metrics.
- `test/integration/` — end-to-end: safe_read twice via MCP client,
  verify second call returns cache_hit.
