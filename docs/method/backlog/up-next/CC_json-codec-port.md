# Codec port/adapter with canonical output

All serialization should go through a codec port, not raw
`JSON.stringify`/`JSON.parse` calls scattered throughout.

## Two codecs, one port

```typescript
// Port interface
interface Codec {
  encode(value: unknown): string | Uint8Array;
  decode(data: string | Uint8Array): unknown;
}
```

**CanonicalJsonCodec** — for MCP responses, NDJSON logs, receipts.
Canonical algorithm: sorted keys recursively + no whitespace
(subset of RFC 8785 JCS). One algorithm, no ambiguity.

**CborCodec** — for WARP worldline patches, AST snapshot storage,
cache persistence. RFC 8949 deterministic encoding.

### Codec selection rule

The codec is chosen by the **surface**, not the consumer:
- MCP tool responses → `CanonicalJsonCodec` (protocol requires JSON)
- NDJSON metrics log → `CanonicalJsonCodec` (human-readable)
- Receipts → `CanonicalJsonCodec` (embedded in API transcripts)
- WARP worldline patches → `CborCodec` (compact binary)
- AST snapshot storage → `CborCodec` (compact binary)

The surface owner (server.ts for MCP, logger.ts for metrics)
injects the correct codec. The domain logic never calls
`JSON.stringify` directly.

## Canonical output (both codecs)

Deterministic serialization ensures:
- Stable hashes (same data → same bytes → same hash)
- Diffable output (no spurious key-order changes)
- Reproducible receipts and metrics logs
- Consistent snapshots for WARP worldline patches

## Migration scope

Current `JSON.stringify` call sites (3 in source):
- `src/mcp/server.ts` — `textResultWithReceipt` (~3 calls via
  the stabilization loop)
- `src/metrics/logger.ts` — NDJSON entry serialization (1 call)

Test files also use `JSON.parse`/`JSON.stringify` but those don't
need the codec (test-only).

## Sequence

1. CanonicalJsonCodec now (replace source `JSON.stringify` calls)
2. CborCodec when WARP integration lands (worldline patch storage)

## Why now

- Receipt integrity (Blacklight needs stable output to compare)
- Observation cache hashes depend on deterministic content
- Systems-Style JavaScript P5: serialization is the codec's problem
- git-warp already uses CBOR — the WARP integration will need it

Effort: S (JSON codec), M (CBOR codec, deferred to WARP cycle)
