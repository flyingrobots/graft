// Pure canonical JSON + SHA-256 review digests for application-layer contracts.

import { sha256Hex } from "./sha256.js";

type ReviewJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly ReviewJsonValue[]
  | { readonly [key: string]: ReviewJsonValue };

export function canonicalJsonSha256Review(domain: string, value: unknown): string {
  return `sha256:${sha256Utf8Hex(canonicalJsonEncode([domain, value]))}`;
}

function canonicalJsonEncode(value: unknown): string {
  return JSON.stringify(normalizeCanonicalJson(value));
}

function normalizeCanonicalJson(value: unknown, seen = new WeakSet()): ReviewJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Canonical JSON input must contain only finite numbers");
    }
    return value;
  }
  if (
    value === undefined ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    throw new TypeError("Canonical JSON input must be JSON data");
  }

  if (seen.has(value)) {
    throw new TypeError("Canonical JSON input must not contain circular data");
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      const output: ReviewJsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError("Canonical JSON input arrays must not contain holes");
        }
        output.push(normalizeCanonicalJson(value[index], seen));
      }
      return output;
    }
    const proto = Object.getPrototypeOf(value) as unknown;
    if (proto !== Object.prototype && proto !== null) {
      throw new TypeError("Canonical JSON input must contain only plain objects");
    }
    const record = value as Record<string, unknown>;
    const sorted = Object.create(null) as Record<string, ReviewJsonValue>;
    for (const key of Object.keys(record).sort()) {
      const item = record[key];
      if (item === undefined) {
        throw new TypeError("Canonical JSON input object fields must not be undefined");
      }
      Object.defineProperty(sorted, key, {
        enumerable: true,
        value: normalizeCanonicalJson(item, seen),
      });
    }
    return sorted;
  } finally {
    seen.delete(value);
  }
}

function sha256Utf8Hex(input: string): string {
  return sha256Hex(new TextEncoder().encode(input));
}
