---
title: "Cycle 0004 — Receipt Mode"
---

# Cycle 0004 — Receipt Mode

**Type:** Feature
**Legend:** CORE
**Sponsor human:** James
**Sponsor agent:** Claude

## Hill

Every graft response is a receipt. Blacklight can extract graft
decisions from API transcripts and prove "with graft" vs "without
graft" with real numbers. No separate log ingestion required.

## Key insight

Graft's MCP responses go through the LLM API. Blacklight already
sees API transcripts. The responses ARE the receipts — we just need
to make them complete and consistent enough that Blacklight can
parse them.

## Playback questions

### Agent perspective

1. Does every response include a compact `_receipt` block with
   session ID, cumulative counters, and decision metadata?
2. Is the receipt small enough that it doesn't meaningfully add
   to context burden?
3. Can I read the receipt to understand my own session health
   (cumulative bytes, cache hit rate)?

### Operator perspective

1. Can Blacklight grep API transcripts for `_receipt` blocks and
   aggregate graft decisions?
2. Can I compare total bytes governed vs total bytes returned
   across sessions?
3. Are cache hits logged to the NDJSON metrics file?

## Non-goals

- **No Blacklight integration code.** Graft emits receipts.
  Blacklight consumes them. The contract is the receipt shape.
- **No network telemetry.** Receipts are in-band (part of the
  MCP response), not out-of-band.

## Design

### Receipt block

Every MCP tool response gains a `_receipt` field:

```typescript
interface Receipt {
  sessionId: string;          // UUID, stable for server lifetime
  seq: number;                // monotonic sequence within session
  ts: string;                 // ISO timestamp
  tool: string;               // tool name
  projection: string;         // content, outline, refused, cache_hit, error
  reason: string;             // reason code
  fileBytes: number | null;   // raw file size (null for non-file ops)
  returnedBytes: number;      // bytes in this response's text content
  cumulative: {
    reads: number;
    outlines: number;
    refusals: number;
    cacheHits: number;
    bytesReturned: number;    // total bytes sent to agent this session
    bytesAvoided: number;     // total bytes NOT sent (outlines + cache)
  };
}
```

Compact. One flat object. No nesting beyond `cumulative`. Every
field is a primitive or null. Blacklight can regex-extract
`"_receipt":` from transcripts.

### Size budget

A receipt is ~300-400 bytes of JSON. On a 12 KB file read, that's
~3% overhead. On a cache hit returning a 500-byte outline, it's
~60% overhead — but the cache hit itself saved 12 KB, so the net
is still massively positive.

### NDJSON logging

All decisions (including cache hits) are now logged to the NDJSON
metrics file. This closes the gap from cycle 0003 where cache hits
were only tracked in stats.

### Session ID

Generated once per `createGraftServer()` call. UUID v4. Stable
for the server's lifetime = one agent session.

### Sequence number

Monotonic counter, incremented on every tool call. Gives Blacklight
total ordering within a session.

## Test strategy

- `test/unit/mcp/receipt.test.ts` — every tool response has
  `_receipt`, receipt shape is correct, sessionId is stable,
  seq increments, cumulative counters accumulate, cache hits
  are logged to NDJSON.
