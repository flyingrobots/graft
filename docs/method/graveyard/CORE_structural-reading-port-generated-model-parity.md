---
title: "StructuralReadingPort generated-model parity"
feature: core
kind: architecture
legend: CORE
lane: asap
priority: 4
effort: L
blocked_by:
  - "CORE_graft-fake-echo-shaped-typescript-witness"
requirements:
  - "Current StructuralReadingPort payloads map into the generated structural-history model"
  - "Current public command behavior is preserved"
  - "git-warp evidence remains provenance-preserving and non-native"
  - "No Echo runtime dependency is introduced"
acceptance_criteria:
  - "Current StructuralReadingPort payloads have a tested generated-model mapping"
  - "Parity fixtures show current git-warp-backed readings produce equivalent public behavior"
  - "Mapped evidence is labeled git-warp-imported or fallback-translated as appropriate"
  - "The slice does not require Echo changes"
---

# StructuralReadingPort generated-model parity

## Hill

Graft proves that current structural reads can enter the generated
structural-history model without changing public behavior.

This is the last clearly Graft-only pre-Echo slice. After this point, further
claims about Echo-native structural history should require a real Echo runtime
or an explicit integration gate.

## Design Packet

Primary design packet:
[`docs/design/CORE_graft-echo-typescript-integration-requirements.md`](../../../design/CORE_graft-echo-typescript-integration-requirements.md)

Related migration card:
[`docs/method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md`](../up-next/CORE_structural-history-schema-and-echo-migration.md)

## Scope

1. Map current `StructuralReadingPort` payloads into the generated
   structural-history model.
2. Preserve current public command behavior while changing the internal model
   boundary.
3. Add parity fixtures for representative git-warp-backed readings.
4. Label mapped facts as `git-warp-imported` or `fallback-translated`, never
   `echo-native`.
5. Document any uncovered behavior that blocks real Echo-backed replacement.

## Non-goals

- Do not change Echo.
- Do not delete git-warp fallback paths.
- Do not claim Echo-native evidence.
- Do not change public command output.
- Do not broaden the migration into unrelated WARP reads.

## Test Strategy

1. Add fixture-driven mapping tests for representative
   `StructuralReadingPort` payloads.
2. Add public-surface parity tests where current behavior depends on those
   payloads.
3. Assert evidence labels explicitly in mapped outputs.
4. Keep real Echo runtime tests out of this slice.

## Playback Questions

1. Can existing structural reads pass through the generated model without
   public behavior drift?
2. Are imported and fallback-translated facts clearly distinguished?
3. Is there a precise gate before any follow-on work claims real Echo-native
   evidence?
