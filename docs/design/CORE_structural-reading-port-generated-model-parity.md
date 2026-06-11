---
title: "StructuralReadingPort generated-model parity"
kind: design-packet
status: active
source_card: docs/method/backlog/asap/CORE_structural-reading-port-generated-model-parity.md
parent_design: docs/design/CORE_graft-echo-typescript-integration-requirements.md
predecessor: docs/design/CORE_graft-fake-echo-shaped-typescript-witness.md
---

# StructuralReadingPort Generated-Model Parity

## Hill

Graft proves that current git-warp-backed structural reads can enter the
Wesley-generated structural-history model and come back out with byte-equal
public behavior. This is the last Graft-only pre-Echo slice; after it, any
`echo-native` claim requires a real Echo runtime behind the integration gate.

## Acceptance Criteria

- A tested, deterministic mapping exists from every
  `StructuralReadingResult<T>` shape (`symbol-reference-count`,
  `dead-symbols`) into the generated model pair
  (`StructuralReading`, `StructuralReadingEvidence`).
- A reverse mapping reconstructs the port result, and round-trip is
  loss-free for all payload fields the public surfaces consume.
- Parity fixtures prove the `graft_dead_symbols` and `graft_review`
  reference-count outputs computed through the generated-model round-trip
  are deep-equal to outputs computed directly from the port result.
- Mapped evidence is `GIT_WARP_IMPORTED` or `FALLBACK_TRANSLATED` exactly as
  the source evidence label dictates; the mapping **refuses** to emit
  `ECHO_NATIVE` from `TranslatedSubstrateEvidence` (typed error).
- No Echo runtime dependency; no public output change; git-warp fallback
  paths untouched.

## Planned Shape

| Piece | Location | Role |
| :--- | :--- | :--- |
| Mapping module | `src/echo/structural-reading-generated-model.ts` | `toGeneratedStructuralReading(result, ctx)` → `{ reading, evidence }` and `fromGeneratedStructuralReading(reading, evidence)` → `StructuralReadingResult<T>`. Pure, deterministic, no I/O. |
| Id derivation | same module | `readingId`/`evidenceId`/`basisId` are sha256-derived from (repositoryId, basis facts, readingKind, payload digest) — stable across runs, no randomness, no clock. |
| Payload digest | same module | `payloadDigest: Hash` = sha256 over canonical-JSON payload bytes (reusing the canonical JSON adapter); `payloadJson` carries the payload verbatim. |
| Enum bridges | same module | port `freshness`/`residualPosture` (lowercase unions) ↔ generated `StructuralReadingFreshness`/`StructuralReadingResidualPosture` (SCREAMING enums); evidence labels via the existing `toGeneratedStructuralEvidenceKind`. |
| Parity fixtures | `test/unit/echo/generated-model-parity.test.ts` | Drive the real `createGitWarpStructuralReadingPort` over stubbed deps (same stub pattern as `test/unit/warp/structural-reading-adapter.test.ts`), round-trip through the generated model, and compare tool-level outputs. |

Notes:

- The mapping consumes/produces the *generated* interfaces from
  `src/generated/graft-structural-history.ts` — the model boundary moves to
  generated types without touching the port interface or its consumers.
- `GitWarpCommittedBasis` maps to a `StructuralBasis` with
  `basisKind: GIT_COMMIT`/`GIT_REF` (per `ref`/`head` presence);
  `parity: NOT_CHECKED` at mapping time (parity *status* belongs to future
  import batches, not this mapping).
- `nativeContinuumWitness` is always `false` for mapped git-warp facts,
  matching the schema invariant
  `fallback_translated_is_not_native_continuum`.

## Test Plan

1. **Mapping, per reading kind**
   - `symbol-reference-count` and `dead-symbols` results map to
     `StructuralReading` with correct `readingKind` enum, payloadJson
     deep-equal to the source payload, and sha256 `payloadDigest` matching
     an independently computed digest.
   - Evidence maps `fallback-translated` → `FALLBACK_TRANSLATED` and
     `git-warp-imported` → `GIT_WARP_IMPORTED`, `nativeContinuumWitness`
     stays `false`, basis facts (projectRoot/ref/head/maxCommits) survive.
2. **Refusal**
   - Attempting to map `TranslatedSubstrateEvidence` to `ECHO_NATIVE` (or a
     hand-built evidence with label `echo-native` but
     `nativeContinuumWitness: false`) throws a typed error naming the
     invariant.
3. **Round-trip**
   - `fromGenerated(toGenerated(result))` deep-equals the original result
     for representative fixtures of both kinds, including empty dead-symbol
     sets and zero-reference counts.
4. **Determinism**
   - Two mapping passes over the same result produce identical ids and
     digests; payload key order does not affect `payloadDigest` (canonical
     JSON).
5. **Public-surface parity** (the headline)
   - `graft_dead_symbols` handler output computed from the direct port
     result vs. from the generated-model round-trip: deep-equal.
   - `graft_review` reference-count path likewise via
     `countSymbolReferences`.
6. **Gate documentation** (non-test deliverable)
   - A "Blockers for Echo-backed replacement" section in this packet lists
     anything the mapping could not represent; empty means the gate is
     purely an Echo-runtime matter.

## Non-goals

- No Echo changes; no real Echo runtime tests.
- No deletion or bypass of git-warp fallback paths.
- No `echo-native` claims anywhere.
- No public API/CLI/MCP output changes.
- No migration of other WARP reads (churn, blame, timelines) — design 0035
  territory.

## Playback Questions

1. Can existing structural reads pass through the generated model without
   public behavior drift?
2. Are imported and fallback-translated facts clearly distinguished?
3. Is there a precise gate before any follow-on work claims real
   Echo-native evidence?

## Open Questions

1. Where should the mapping module live — `src/echo/` (proposed, beside the
   witness stack it will eventually feed) or `src/warp/` (beside the
   adapter it consumes)? Recommendation: `src/echo/`, since slice 5+ feeds
   these generated shapes to Echo, and the warp adapter stays
   mapping-agnostic.
2. Should `recordGitWarpImportBatch` vars eventually be *produced* by this
   mapping (readings → import batch)? Out of scope here, but the id
   derivation is designed so a future batch builder can reuse it.
