---
title: "Graft fake Echo-shaped TypeScript witness"
kind: design-packet
status: active
source_card: docs/method/backlog/asap/CORE_graft-fake-echo-shaped-typescript-witness.md
parent_design: docs/design/CORE_graft-echo-typescript-integration-requirements.md
reference_implementation: ~/git/jedit (Echo/Wesley contract-host consumer)
---

# Graft Fake Echo-Shaped TypeScript Witness

## Hill

Graft proves the shape of its Echo-facing TypeScript seam — byte-level kernel
transport, typed structural-history client, and an Echo-backed
`StructuralReadingPort` adapter — before any real Echo runtime is wired in.
The fake lives only at the transport seam; every layer above it is real
integration code that survives the swap to the real Echo kernel unchanged.

## Canonical Pattern (from jedit)

Jedit is the working reference for an app consuming Echo through
Wesley-compiled GraphQL contracts:

1. The app declares Graph Entities, Intents (mutations), and Observers
   (bounded queries) in GraphQL with `@wes_op` / `@wes_footprint` directives.
2. Wesley compiles these to TypeScript (and Rust): types, operation objects,
   codecs, observer plans.
3. App code talks to Echo through a byte-level transport seam
   (`kernelInfo()`, `submitIntentBytes(bytes)`, `observeBytes(bytes)`); a
   typed client encodes intent envelopes and observe requests over it.
4. Obstructions come back as typed `{ code, message, recovery? }` payloads in
   a discriminated-union response; the client throws a typed obstruction
   error that callers branch on by `code`.
5. Tests run the real typed client over a deterministic in-memory fake
   transport (`fake-echo-jedit-optic-transport.ts`); the fake is a permanent
   fixture, not scaffolding.
6. Package registration (descriptor + installer with preflight) is a separate
   trusted-host port, never part of the app-safe client.

Graft already holds two pieces of this: the Wesley-generated model and query
operations (`src/generated/graft-structural-history.ts`) and the contract
package descriptor from slice 2
(`schemas/graft-structural-history.echo-package.json`).

## Discovered Gap

The generated structural-history model declares only queries
(`queryStructural*Operation`, `queryGitWarpImportBatchesOperation`). The
canonical pattern requires the submit flow to ride a declared Intent. This
slice therefore adds one minimal mutation to the canonical schema —
`recordGitWarpImportBatch` — the natural first write: admitting a
git-warp-imported batch of structural facts. Schema authority is Graft-owned
(slice 1), so this is a Graft-only change.

## Acceptance Criteria

- Graft has a byte-level Echo kernel transport port
  (`kernelInfo`, `submitIntentBytes`, `observeBytes`) exposing no trusted-host
  authority: no tick/scheduler control, no runtime lifecycle, no package
  installation, no WAL or kernel mutation.
- A typed structural-history client rides the transport using the generated
  operation objects and a deterministic envelope codec.
- The canonical schema declares the `recordGitWarpImportBatch` intent and the
  generated model includes it.
- A deterministic, fixture-seeded fake transport executes intents and observe
  requests against an in-memory structural-history store.
- An Echo-backed `StructuralReadingPort` adapter maps client readings and
  typed obstructions into Graft freshness/residual/evidence posture.
- Tests exercise the seam through Graft application code (the `dead_symbols`
  and `structural-review` tool paths), not direct fake calls.
- Authority-boundary tests fail if any layer reaches past its seam.
- No Echo repository change. No public API/CLI/MCP output change.

## Planned Shape

| Piece | Location | Role |
| :--- | :--- | :--- |
| Kernel transport port | `src/ports/echo-kernel-transport.ts` | Byte seam: `kernelInfo()`, `submitIntentBytes(Uint8Array): Uint8Array`, `observeBytes(Uint8Array): Uint8Array`. The swap point between fake and real Echo. |
| Generated codecs | `src/generated/graft-structural-history.codec.generated.ts` | Wesley 0.0.4 `le-binary` TypeScript emitter output for Graft's schema: per-operation var encoders/decoders and `OP_*` ids, wire-compatible with Rust `echo_wasm_abi::codec` (proven by jedit's `rope.codec.generated.ts`). |
| Codec runtime | `src/echo/codec-runtime.ts` | `Writer`/`Reader`/`CodecError` runtime the generated codecs import, mirrored from jedit's `src/codec.ts`. |
| Envelope codec | `src/echo/structural-history-envelope-codec.ts` | Thin envelope packing (`packIntentV1(opId, encodedVars)`-style) and discriminated-union response decode over the generated codecs. No hand-authored field encoding. |
| Typed client | `src/echo/structural-history-client.ts` | `createEchoStructuralHistoryClient(transport)`: `recordGitWarpImportBatch(...)`, `structuralReadings(...)`, `structuralReadingEvidence(...)` built from generated operation objects; throws typed obstruction error on `OBSTRUCTED` status. |
| Fake transport | `src/adapters/fake-echo-kernel-transport.ts` | Deterministic in-memory store seeded from fixtures; decodes envelopes, executes, encodes responses; produces typed obstructions on demand. |
| Echo reading adapter | `src/echo/structural-reading-adapter.ts` | `createEchoStructuralReadingPort(client)` implementing `StructuralReadingPort`, sibling to `src/warp/structural-reading-adapter.ts`. |

## Obstruction → Posture Mapping

Obstructions carry `{ code, message, recovery? }`; the adapter branches on
`code`:

| Obstruction code | Freshness | Residual posture |
| :--- | :--- | :--- |
| (successful reading) | `current` | `complete` |
| `STALE_BASIS` | `stale` | `complete` |
| `BUDGET_EXCEEDED` | `current` | `budget-limited` |
| `RIGHTS_LIMITED` | `current` | `rights-limited` |
| `MISSING_RETENTION` | `incomparable` | `unavailable` |
| `UNSUPPORTED_OPERATION`, `UNSUPPORTED_QUERY`, `RUNTIME_FAULT` | typed Graft error (`EchoSubstrateObstructionError`); never a silent empty payload, never a raw substrate error | — |

Runtime faults remain distinguishable from lawful rejections: a rejected
intent is an `ok`-status response with a rejection outcome and receipt
evidence; a fault is an `OBSTRUCTED` response.

## Evidence Posture Decision

Readings produced through the fake-backed adapter emit Echo-shaped
`ContinuumNativeEvidence` (envelope ref, optional witness shell ref) to prove
the shape end to end. This is acceptable only because the adapter is never
wired into production contexts in this slice: `server-context.ts` and
`repo-tool-worker-context.ts` keep constructing the git-warp port. A guard
test asserts no production context module imports the Echo adapter. No
durability claim is made anywhere.

## Non-goals

- Do not change Echo or add Graft semantics to Echo.
- Do not claim crash-safe retained evidence.
- Do not require Rust bindings, WASM kernels, or a real Echo daemon.
- Do not implement package installation; the descriptor (slice 2) and a
  future installer remain trusted-host scope.
- Do not hand-author field-level codecs; all wire encoding comes from the
  Wesley `le-binary` emitter plus the shared codec runtime.
- Do not replace git-warp-backed behavior in public surfaces or wire the Echo
  adapter into production contexts.
- Do not build git-warp vs generated-model parity fixtures (slice 4).

## Test Plan

1. **Authority boundary**
   - The transport port surface is exactly `kernelInfo`, `submitIntentBytes`,
     `observeBytes`: forbidden families (`tick`, `step`, `superTick`, runtime
     lifecycle, package install, WAL mutation, kernel mutation, scheduler
     recovery) are absent from the fake transport and the typed client.
   - Proxy-witness test: wrap the fake transport in a recording proxy, run
     both port flows, assert only the three declared members were touched.
   - Production-context guard: no `src/mcp/*context*.ts` module imports the
     Echo adapter, typed client, or fake transport.
2. **Codecs and envelopes**
   - Generated var codecs round-trip (encode → decode → deep-equal) for the
     intent and each query operation.
   - Encoding is deterministic: same logical envelope → identical bytes.
   - Malformed bytes surface as `CodecError` mapped to a typed codec
     obstruction, never a raw runtime throw.
   - The generated codec file is checked by the existing hermetic
     schema-artifact gate (`pnpm schema:structural-history:check`), so drift
     between schema and codecs fails CI.
3. **Submit/observe intent flow** (`recordGitWarpImportBatch`)
   - Same canonical intent bytes → same stable submission identity.
   - Applied outcome carries receipt evidence; rejected outcome carries a
     typed reason and receipt; unknown submission id → typed `unknown`
     outcome, not a throw.
4. **Query flow through application code**
   - `dead_symbols` tool handler with a context whose
     `getStructuralReadingPort()` returns the Echo-backed adapter over a
     seeded fake transport → expected `DeadSymbolsReadingPayload`,
     `current`/`complete`, Echo-shaped evidence.
   - `structural-review` symbol-reference path likewise for
     `SymbolReferenceReadingPayload`.
5. **Obstruction mapping** — one test per row of the table, branching on
   obstruction `code`, including that `RUNTIME_FAULT` surfaces as
   `EchoSubstrateObstructionError` and is distinguishable from a lawful
   rejection outcome.
6. **Retained-evidence posture** — fixture toggles retained, missing, and
   obstructed posture; adapter surfaces each without a durability claim.
7. **Determinism** — two full runs over the same fixture seed produce
   deep-equal results, including envelope bytes.

## Playback Questions

1. Does the witness expose the minimum Graft actually needs from Echo?
2. Can the fake transport be swapped for the real Echo kernel transport
   without changing the typed client, the adapter, or Graft's domain model?
3. Are all missing Echo capabilities written down as generic substrate needs
   rather than Graft-specific semantics?
4. Can a reviewer prove from tests alone that no trusted-host authority leaks
   into the app-facing surfaces?

## Open Questions

1. Is adding the `recordGitWarpImportBatch` intent to the canonical schema in
   this slice acceptable, or should the submit flow wait for a dedicated
   schema slice? Recommendation: add it here — the canonical pattern requires
   a declared intent for the submit witness, and schema authority is already
   Graft-owned.
2. Resolved during playback: Wesley 0.0.4 (Graft's pinned version) already
   emits LE-binary TypeScript codecs wire-compatible with Rust
   `echo_wasm_abi::codec`, proven by jedit's `rope.codec.generated.ts`. The
   witness uses generated codecs; no hand-rolled stand-in. Residual risk: if
   the emitter rejects a construct in Graft's schema, that gap gets filed as
   planning work rather than worked around by hand.
3. Is emitting `ContinuumNativeEvidence` from the fake-backed adapter in test
   space acceptable, or should a distinct fake-witness evidence marker exist?
   Recommendation: emit the Echo-native shape, keep the adapter out of
   production wiring, and enforce that with a guard test.
