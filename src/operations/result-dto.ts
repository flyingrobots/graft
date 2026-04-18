// ---------------------------------------------------------------------------
// Result DTO — converts runtime result objects to JSON-serializable records
// ---------------------------------------------------------------------------

import type { JsonObject } from "../contracts/json-object.js";

/**
 * Convert any result object with known fields into a plain JsonObject
 * suitable for ctx.respond(). Strips class identity, prototype chain,
 * and index signatures — the result is a clean { ...fields } record.
 *
 * Skips undefined values to keep the serialized output compact.
 */
export function toJsonObject(result: object): JsonObject {
  const obj: JsonObject = {};
  const source = result as Record<string, unknown>;
  for (const key of Object.keys(source)) {
    if (source[key] !== undefined) {
      obj[key] = source[key];
    }
  }
  return obj;
}
