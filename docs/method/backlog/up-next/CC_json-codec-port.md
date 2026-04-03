# Codec port/adapter with canonical output

All serialization should go through a codec port, not raw
`JSON.stringify`/`JSON.parse` calls scattered throughout.

## Two codecs, one port

```javascript
// Port interface
class Codec {
  encode(value) { /* → string or Uint8Array */ }
  decode(data) { /* → parsed value */ }
}
```

**CanonicalJsonCodec** — for MCP responses, NDJSON logs, receipts.
Keys sorted deterministically (RFC 8785 or sorted-keys + no
whitespace). Human-readable.

**CborCodec** — for WARP worldline patches, AST snapshot storage,
cache persistence. RFC 8949 deterministic encoding. Compact binary,
schema-native types survive the round-trip.

The consumer calls `codec.encode(value)` and doesn't know which
format. JSON surfaces get JSON. Storage surfaces get CBOR.

## Canonical output (both codecs)

Deterministic serialization ensures:
- Stable hashes (same data → same bytes → same hash)
- Diffable output (no spurious key-order changes)
- Reproducible receipts and metrics logs
- Consistent snapshots for WARP worldline patches

## Sequence

1. CanonicalJsonCodec now (replace ~20 raw JSON.stringify calls)
2. CborCodec when WARP integration lands (worldline patch storage)

## Why now

- Receipt integrity (Blacklight needs stable output to compare)
- Observation cache hashes depend on deterministic content
- Systems-Style JavaScript P5: serialization is the codec's problem
- git-warp already uses CBOR — the WARP integration will need it

Effort: S (JSON codec), M (CBOR codec, deferred to WARP cycle)
