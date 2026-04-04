# Cycle 0017 — JSON Codec Port

**Legend**: CC (clean code)
**Branch**: cycle/0017-json-codec-port
**Status**: complete

## Goal

No source file calls `JSON.stringify` directly. All JSON
serialization goes through a `JsonCodec` port with a canonical
(sorted-key, compact) implementation.

## What shipped

- `src/ports/codec.ts` — `JsonCodec` interface (encode/decode).
- `src/adapters/canonical-json.ts` — `CanonicalJsonCodec` with
  recursive key sorting (subset of RFC 8785 JCS). Deterministic:
  same data always produces the same string regardless of key
  insertion order.
- Codec threaded through `ReceiptDeps`, `MetricsLoggerOptions`,
  `SafeReadOptions`, and `ToolContext`. Single instance created in
  `createGraftServer()`.
- Hook script (`posttooluse-read.ts`) imports the adapter directly
  (edge script, not domain logic — no DI needed).
- 14 new tests covering sort, nesting, arrays, primitives, empty
  structures, determinism, round-trip, and error handling.
- Design doc: `docs/design/0017-json-codec-port/design.md`.

## Decisions

1. **`JsonCodec` not `Codec`** — the port is JSON-specific. When
   CBOR arrives for WARP, it gets a separate `BinaryCodec` port
   rather than a union-typed generic.
2. **`sortDeep` before stringify** — the only reliable way to
   control key order in `JSON.stringify` output. Replacer functions
   can't reorder keys.
3. **Hook imports adapter directly** — hooks are standalone edge
   scripts that run as subprocesses. They don't participate in DI.
   Importing the concrete adapter is the right call.
4. **`JSON.parse` in shared.ts stays** — input parsing is not
   codec business. The codec is about serialization output.

## Metrics

- 1 commit (so far, pre-PR)
- 2 new source files, 1 new test file, 11 files modified
- 14 new tests, 361 total
- Zero `JSON.stringify` remaining in source (only in adapter)
