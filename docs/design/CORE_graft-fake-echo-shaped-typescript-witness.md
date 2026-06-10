---
title: "Graft fake Echo-shaped TypeScript witness"
kind: design-packet
status: active
source_card: docs/method/backlog/asap/CORE_graft-fake-echo-shaped-typescript-witness.md
parent_design: docs/design/CORE_graft-echo-typescript-integration-requirements.md
---

# Graft Fake Echo-Shaped TypeScript Witness

## Hill

Graft proves the shape of its Echo-facing TypeScript seam — app-safe client
interface, deterministic fake, and an Echo-backed `StructuralReadingPort`
adapter — before any real Echo runtime exists. The fake witness validates the
Graft-side authority boundary and adapter ergonomics without smuggling Graft
semantics into Echo or claiming real durability.

## Acceptance Criteria

- Graft has an app-safe Echo-shaped TypeScript client interface
  (`EchoContractClient`) covering: intent submission, intent outcome
  observation, bounded query observation, and retained-evidence posture.
- The interface exposes none of the forbidden trusted-host families: tick or
  scheduler controls, runtime start/stop/drain, package installation, WAL
  append/recovery, raw kernel mutation, scheduler fault recovery.
- A deterministic, fixture-backed fake implementation supports the
  submit/query/observe flows.
- An Echo-backed `StructuralReadingPort` adapter
  (`createEchoStructuralReadingPort`) maps client outcomes and typed
  obstructions into Graft freshness/residual/evidence posture.
- Tests exercise the seam through Graft application code (the `dead_symbols`
  and `structural-review` tool paths), not through direct fake calls.
- Authority-boundary tests fail if the adapter reaches past the app-safe
  interface.
- No Echo repository change. No public API/CLI/MCP output change.

## Planned Shape

| Piece | Location | Role |
| :--- | :--- | :--- |
| `EchoContractClient` port | `src/ports/echo-contract-client.ts` | App-safe interface: `submitIntent`, `observeIntentOutcome`, `observeQuery`, `inspectRetainedEvidence`. Typed outcomes and obstructions. |
| Fake client | `src/adapters/fake-echo-contract-client.ts` | Deterministic, fixture-seeded implementation for tests and local development. |
| Echo reading adapter | `src/echo/structural-reading-adapter.ts` | `createEchoStructuralReadingPort(client)` implementing `StructuralReadingPort`, sibling to the git-warp adapter in `src/warp/`. |

Typed obstructions (per parent design R5): `unsupported-operation`,
`unsupported-query`, `admission-obstruction`, `runtime-fault`,
`missing-retention`, `stale-basis`, `budget-exceeded`. Applied and rejected
outcomes carry receipt evidence. Runtime faults are distinguishable from
lawful rejections.

## Obstruction → Posture Mapping

| Client outcome | Freshness | Residual posture |
| :--- | :--- | :--- |
| Successful reading | `current` | `complete` |
| `stale-basis` | `stale` | `complete` |
| `budget-exceeded` | `current` | `budget-limited` |
| Rights-limited reading | `current` | `rights-limited` |
| `missing-retention` | `incomparable` | `unavailable` |
| `unsupported-operation`, `unsupported-query`, `runtime-fault` | typed Graft error (`EchoSubstrateObstructionError`); never a silent empty payload, never a raw substrate error | — |

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
- Do not require Rust bindings or a real Echo daemon.
- Do not replace git-warp-backed behavior in public surfaces or wire the Echo
  adapter into production contexts.
- Do not build parity fixtures comparing git-warp and generated-model readings
  (that is slice 4, `CORE_structural-reading-port-generated-model-parity`).

## Test Plan

1. **Authority boundary**
   - The `EchoContractClient` surface exposes no forbidden method family:
     enumerate forbidden keys (`tick`, `step`, `superTick`, runtime control,
     package install, WAL mutation, kernel mutation, scheduler recovery) and
     assert they are absent from the fake.
   - Proxy-witness test: wrap the fake in a recording proxy, run both port
     flows, assert the adapter touched only declared interface members.
   - Production-context guard: no `src/mcp/*context*.ts` module imports the
     Echo adapter or the fake.
2. **Submit/observe intent flow**
   - Same canonical intent bytes → same stable submission identity.
   - Applied outcome carries receipt evidence; rejected outcome carries a
     typed reason; unknown submission id → typed `unknown` outcome, not a
     throw.
3. **Query flow through application code**
   - `dead_symbols` tool handler with a context whose
     `getStructuralReadingPort()` returns the Echo-backed adapter over a
     seeded fake → expected `DeadSymbolsReadingPayload`, `current`/`complete`,
     Echo-shaped evidence.
   - `structural-review` symbol-reference path likewise for
     `SymbolReferenceReadingPayload`.
4. **Obstruction mapping** — one test per row of the mapping table, including
   that `runtime-fault` surfaces as `EchoSubstrateObstructionError` and is
   distinguishable from a lawful rejection.
5. **Retained-evidence posture** — fixture toggles retained, missing, and
   obstructed posture; adapter surfaces each without a durability claim.
6. **Determinism** — two runs over the same fixture seed produce deep-equal
   results.

## Playback Questions

1. Does the fake witness expose the minimum Graft actually needs from Echo?
2. Can the fake be swapped for a real Echo TypeScript client later without
   changing Graft's domain model?
3. Are all missing Echo capabilities written down as generic substrate needs
   rather than Graft-specific semantics?
4. Can a reviewer prove from tests alone that no trusted-host authority leaks
   into the app-facing adapter?

## Open Questions

1. Is emitting `ContinuumNativeEvidence` from the fake-backed adapter in test
   space acceptable, or should a distinct fake-witness evidence marker exist?
   Recommendation in this packet: emit the Echo-native shape, keep the adapter
   out of production wiring, and enforce that with a guard test.
