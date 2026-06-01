---
title: "Graft fake Echo-shaped TypeScript witness"
feature: core
kind: architecture
legend: CORE
lane: asap
priority: 3
effort: L
requirements:
  - "Structural-history Echo package descriptor shipped in PR #65"
  - "Graft proves the Echo-facing TypeScript seam before depending on Echo runtime changes"
  - "The fake witness is deterministic and local"
  - "Graft does not reach through the app/host authority boundary"
  - "No real Echo durability claim is made"
acceptance_criteria:
  - "Graft has an app-safe Echo-shaped TypeScript client interface for structural-history usage"
  - "A deterministic fake implementation supports the needed submit/query/observe flows"
  - "Tests prove Graft uses the interface rather than Echo internals"
  - "No Echo repository change is required"
---

# Graft fake Echo-shaped TypeScript witness

## Hill

Graft proves the shape of its future Echo integration from TypeScript before
requiring a real Echo runtime.

This slice deliberately uses a fake or fixture-backed witness. Its purpose is
to validate the Graft-side adapter, authority boundary, and developer ergonomics
without smuggling Graft semantics into Echo.

## Design Packet

Primary design packet:
[`docs/design/CORE_graft-echo-typescript-integration-requirements.md`](../../../design/CORE_graft-echo-typescript-integration-requirements.md)

Related migration card:
[`docs/method/backlog/up-next/CORE_structural-history-schema-and-echo-migration.md`](../up-next/CORE_structural-history-schema-and-echo-migration.md)

Shipped prerequisite:
[`docs/method/graveyard/CORE_graft-structural-history-echo-package-descriptor.md`](../../graveyard/CORE_graft-structural-history-echo-package-descriptor.md)

## Required Boundary

The fake witness should model the app-safe surface Graft needs, not Echo's
internal host machinery.

Expected capabilities:

| Capability | Purpose |
| :--- | :--- |
| submit | Accept structural-history writes or mutations in the package shape Graft expects. |
| query | Read structural-history facts through the generated model. |
| observe | Model the eventual observer flow if the Graft surface requires it. |
| retained evidence posture | Represent whether evidence is retained, missing, obstructed, or unavailable without claiming real durability. |
| obstruction mapping | Convert substrate failures into Graft-owned diagnostics. |

## Scope

1. Define the minimal TypeScript interface Graft expects from an Echo-backed
   structural-history adapter.
2. Add a deterministic fake implementation for tests and local development.
3. Exercise the interface through Graft application code rather than direct
   fake calls.
4. File any real Echo client gaps discovered by this witness as explicit Echo
   planning work, not as hidden Graft assumptions.

## Non-goals

- Do not change Echo.
- Do not add Graft semantics to Echo.
- Do not claim crash-safe retained evidence.
- Do not require Rust bindings or a real Echo daemon.
- Do not replace git-warp-backed behavior in public surfaces.

## Test Strategy

1. Add focused tests for submit/query/observe paths required by the structural
   history integration.
2. Add authority-boundary tests proving Graft depends on the app-safe interface,
   not Echo internals.
3. Keep fake outputs deterministic and fixture-backed.

## Playback Questions

1. Does the fake witness expose the minimum Graft actually needs from Echo?
2. Can the fake be swapped for a real Echo TypeScript client later without
   changing Graft's domain model?
3. Are all missing Echo capabilities written down as generic substrate needs
   rather than Graft-specific semantics?
