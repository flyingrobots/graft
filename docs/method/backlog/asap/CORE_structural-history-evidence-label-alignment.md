---
title: "Structural history evidence label alignment"
feature: core
kind: architecture
legend: CORE
lane: asap
priority: 1
effort: M
requirements:
  - "Graft owns structural-history semantics"
  - "Evidence provenance is explicit in generated structural-history facts"
  - "git-warp-derived facts never masquerade as Echo-native witnesshood"
  - "Existing public command behavior remains unchanged"
acceptance_criteria:
  - "The structural-history schema/model names the evidence labels echo-native, git-warp-imported, and fallback-translated"
  - "Current StructuralReadingPort payloads can carry or map to the evidence label taxonomy"
  - "Documentation explains when each evidence label is valid"
  - "No Echo code or Echo semantics are changed"
---

# Structural history evidence label alignment

## Hill

Graft makes structural-history provenance explicit before runtime migration, so
facts imported from git-warp or translated through fallback paths cannot be
confused with Echo-native facts.

This is the first Graft-only slice after the Wesley hermetic generation gate.
The goal is not to move storage. The goal is to make evidence posture visible
in the schema-backed model that later storage work must preserve.

## Design Packet

Primary design packet:
[`docs/design/CORE_graft-echo-typescript-integration-requirements.md`](../../../design/CORE_graft-echo-typescript-integration-requirements.md)

Related migration card:
[`docs/method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md`](../up-next/CORE_structural-history-schema-and-echo-migration.md)

## Required Evidence Labels

| Label | Meaning |
| :--- | :--- |
| `echo-native` | The fact was written, retained, and read through the Echo-backed structural-history path. |
| `git-warp-imported` | The fact came from git-warp and was imported into the canonical Graft structural-history model with source provenance preserved. |
| `fallback-translated` | The fact was read through a git-warp compatibility path after the schema model exists. |

These labels are separate from Continuum witnesshood. A fact can be
Continuum-shaped without being a Continuum-native witness.

## Scope

1. Define the evidence label taxonomy in the schema-backed structural-history
   model.
2. Ensure the current `StructuralReadingPort` payloads can map to the taxonomy.
3. Document the current source for each label and the transition rules for the
   Echo migration.
4. Preserve current public command output unless a later design packet
   explicitly authorizes a surface change.

## Non-goals

- Do not change Echo.
- Do not change Wesley semantics.
- Do not claim any current git-warp fact is `echo-native`.
- Do not delete fallback git-warp paths.
- Do not change public command output as part of this slice.

## Test Strategy

1. Add focused tests around evidence label normalization or mapping.
2. Add fixture coverage that proves git-warp-backed current facts become
   `git-warp-imported` or `fallback-translated`, not `echo-native`.
3. Keep assertions deterministic and local to Graft.

## Playback Questions

1. Can a reviewer tell whether a structural-history fact is native, imported,
   or fallback-translated?
2. Can current `StructuralReadingPort` payloads enter the generated model
   without losing provenance?
3. Does any test or doc imply Echo runtime authority before Echo is actually in
   the loop?
