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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

function sortDeep(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    throw new TypeError("Converting circular structure to JSON");
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((v) => sortDeep(v, seen));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortDeep(value[key], seen);
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
