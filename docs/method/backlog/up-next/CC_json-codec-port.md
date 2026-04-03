# JSON codec behind port/adapter with canonical output

All JSON serialization and deserialization should go through a
codec port, not raw `JSON.stringify`/`JSON.parse` calls scattered
throughout the codebase.

## Canonical output

Keys sorted deterministically in all JSON output. This ensures:
- Stable hashes (same data → same bytes → same hash)
- Diffable output (no spurious key-order changes)
- Reproducible receipts and metrics logs
- Consistent snapshots for WARP worldline patches

## Adapter pattern

```javascript
// Port
class JsonCodec {
  encode(value) { /* canonical sorted keys */ }
  decode(text) { /* parse + optional schema validation */ }
}
```

Current: ~20 raw `JSON.stringify` calls in `src/mcp/server.ts`
alone. Each is an opportunity for inconsistent serialization.

## Why now

This is foundational for:
- Receipt integrity (Blacklight needs stable output to compare)
- WARP worldline patches (structural diffs depend on deterministic
  serialization for hash stability)
- Observation cache (content hashes should be deterministic)
- Systems-Style JavaScript (P5: serialization is the codec's problem)

Effort: S
