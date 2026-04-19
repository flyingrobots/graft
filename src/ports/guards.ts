// ---------------------------------------------------------------------------
// Port runtime guards — construction-time validation for port adapters
// ---------------------------------------------------------------------------

import type { FileSystem } from "./filesystem.js";
import type { JsonCodec } from "./codec.js";

const FILESYSTEM_METHODS = [
  "readFile",
  "readdir",
  "writeFile",
  "appendFile",
  "mkdir",
  "stat",
  "readFileSync",
] as const;

const CODEC_METHODS = ["encode", "decode"] as const;

function assertMethodsPresent(
  portName: string,
  impl: Record<string, unknown>,
  methods: readonly string[],
): void {
  for (const method of methods) {
    if (typeof impl[method] !== "function") {
      throw new TypeError(
        `${portName} adapter missing method: ${method} (got ${typeof impl[method]})`,
      );
    }
  }
}

/**
 * Validate that an object satisfies the FileSystem port contract at
 * runtime. Call this at adapter construction boundaries to catch
 * broken mocks and incomplete implementations early.
 */
export function assertFileSystem(impl: unknown): asserts impl is FileSystem {
  if (impl === null || typeof impl !== "object") {
    throw new TypeError(
      `FileSystem adapter must be an object (got ${impl === null ? "null" : typeof impl})`,
    );
  }
  assertMethodsPresent(
    "FileSystem",
    impl as Record<string, unknown>,
    FILESYSTEM_METHODS,
  );
}

/**
 * Validate that an object satisfies the JsonCodec port contract at
 * runtime. Call this at adapter construction boundaries to catch
 * broken mocks and incomplete implementations early.
 */
export function assertJsonCodec(impl: unknown): asserts impl is JsonCodec {
  if (impl === null || typeof impl !== "object") {
    throw new TypeError(
      `JsonCodec adapter must be an object (got ${impl === null ? "null" : typeof impl})`,
    );
  }
  assertMethodsPresent(
    "JsonCodec",
    impl as Record<string, unknown>,
    CODEC_METHODS,
  );
}
