# Cycle 0017: JSON Codec Port

## Hill

No source file calls `JSON.stringify` directly. All JSON
serialization goes through a `JsonCodec` port with a canonical
(sorted-key, compact) implementation.

## Sponsor

Systems-Style JavaScript P5: serialization is the codec's problem.
Canonical output enables stable hashes, diffable logs, reproducible
receipts.

## Targets

| Call site | File | Purpose |
|-----------|------|---------|
| Receipt stabilization loop | `src/mcp/receipt.ts:56` | Serialize full tool response |
| NDJSON metrics log | `src/metrics/logger.ts:29` | Serialize decision entry |
| Outline byte estimation | `src/operations/safe-read.ts:84` | Estimate bytes avoided |
| Hook outline estimation | `src/hooks/posttooluse-read.ts:86` | Estimate bytes saved |

## Design

### Port

```typescript
// src/ports/codec.ts
export interface JsonCodec {
  encode(value: unknown): string;
  decode(data: string): unknown;
}
```

### Adapter

```typescript
// src/adapters/canonical-json.ts
export class CanonicalJsonCodec implements JsonCodec {
  encode(value: unknown): string {
    return JSON.stringify(sortDeep(value));
  }
  decode(data: string): unknown {
    return JSON.parse(data);
  }
}
```

`sortDeep` recursively sorts object keys before stringifying.
Arrays preserve order. Primitives pass through.

### Injection

- `ReceiptDeps` gains `codec: JsonCodec`
- `MetricsLoggerOptions` gains `codec: JsonCodec`
- `SafeReadOptions` gains `codec: JsonCodec`
- `createGraftServer()` instantiates one `CanonicalJsonCodec` and
  threads it through
- Hook scripts import the adapter directly (they're edge scripts,
  not domain logic)

### What does NOT change

- `JSON.parse` in `src/hooks/shared.ts` — input parsing, not codec
- Test files — test-only serialization doesn't need the codec

Effort: S
