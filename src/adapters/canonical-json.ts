// ---------------------------------------------------------------------------
// CanonicalJsonCodec — deterministic JSON with sorted keys
// ---------------------------------------------------------------------------
//
// Subset of RFC 8785 (JSON Canonicalization Scheme):
//   - Object keys sorted lexicographically at every nesting level
//   - Compact output (no whitespace)
//   - Deterministic: same data always produces the same string
//
// Enables stable hashes, diffable logs, reproducible receipts.
// ---------------------------------------------------------------------------

import type { JsonCodec } from "../ports/codec.js";

function sortDeep(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  const obj = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortDeep(obj[key]);
  }
  return sorted;
}

export class CanonicalJsonCodec implements JsonCodec {
  encode(value: unknown): string {
    return JSON.stringify(sortDeep(value));
  }

  decode(data: string): unknown {
    return JSON.parse(data) as unknown;
  }
}
