---
title: "Unpinned committed-history bases deserve their own basis kind"
legend: "CORE"
cycle: "CORE_unpinned-basis-kind-for-structural-history"
source_backlog: "docs/method/backlog/up-next/CORE_unpinned-basis-kind-for-structural-history.md"
---

# Unpinned committed-history bases deserve their own basis kind

Source backlog item: `docs/method/backlog/up-next/CORE_unpinned-basis-kind-for-structural-history.md`
Legend: CORE

## Hill

Graft structural-history schema v0.2 names unpinned committed history as its
own basis kind. A git-warp reading over committed history with no `ref` and no
`head` maps to `UNPINNED_COMMITTED`, while `GIT_REF` is reserved for bases with
a present `refName`. The Wesley-generated declarations, LE-binary codec,
manifest, descriptor, mapper, tests, and changelog all move in one slice.

## Playback Questions

### Human

- [ ] Does the generated model stop asserting `GIT_REF` for dead-symbols
      readings that have no ref/head basis?
- [ ] Does this remain a Graft-only schema/local adapter change, with no real
      Echo runtime dependency or new `echo-native` claim?

### Agent

- [ ] Does the RED parity test fail before the mapper/schema change and pass
      afterward?
- [ ] Do the committed Wesley declarations, codec, manifest, and Echo package
      descriptor match the v0.2 schema?
- [ ] Does every emitted `GIT_REF` basis still carry a semantically present
      `refName`?
- [ ] Do existing public git-warp-backed results round-trip through the
      generated model without changing user-facing output?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: schema names should let an agent
  or human read a `StructuralBasis` row without interpreting `GIT_REF` plus
  `refName: null` as an implicit special case.
- Non-visual or alternate-reading expectations: no UI layout changes.

## Localization and Directionality

- Locale / wording / formatting assumptions: enum spelling is protocol text
  and remains ASCII/English; no localized display string is added here.
- Logical direction / layout assumptions: no directional layout behavior.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the basis-kind decision
  is a pure function of translated substrate basis facts: `head` means
  `GIT_COMMIT`; `ref` means `GIT_REF`; neither means `UNPINNED_COMMITTED`.
- What must be attributable, evidenced, or governed: the schema source hash,
  Wesley L1 registry hash, generated TypeScript hash, and descriptor hash facts
  must be updated from the same schema revision.

## Non-goals

- [ ] Do not introduce a real Echo runtime dependency.
- [ ] Do not claim current git-warp fallback readings are Echo-native witness
      material.
- [ ] Do not change public MCP/CLI response payloads for `graft_dead_symbols`
      or `graft_review`.
- [ ] Do not implement the broader multidimensional EvidencePosture model.
- [ ] Do not move remaining WARP reads onto a new substrate.

## Backlog Context

### Context

Slice 4's mapping sends a dead-symbols reading with no `ref`/`head` to
`basisKind: GIT_REF` with `refName: null` — asserting a ref-based basis
that names no ref. The schema's `StructuralBasisKind` has no value for
"committed history, not pinned to a ref or commit", and `LIVE_FRONTIER`
would be wrong (the read is over committed history). Recorded as gate-
section item 2 in the slice 4 design packet; James sanctioned the rename
(2026-06-11).

### Desired outcome

Next schema revision (v0.2) of `schemas/graft-structural-history.graphql`:

- add an explicit basis kind for unpinned committed history (working name
  `UNPINNED_COMMITTED`) to `StructuralBasisKind`;
- regenerate via Wesley (types + codecs + manifest digest bump);
- update `toGeneratedStructuralReading` basis-kind logic
  (`src/echo/structural-reading-generated-model.ts`) and its tests so the
  no-ref/no-head case maps to the new kind;
- keep `GIT_REF` strictly meaning "resolve via refName" (refName becomes
  semantically non-null for GIT_REF rows, even if the column stays
  nullable in v0.x).

### Constraints

- Schema change → coordinate with the Wesley pin and the
  `graft-structural-history` manifest digest; same-commit regeneration.
- Slice 4's parity tests pin the current behavior
  (`test/unit/echo/generated-model-parity.test.ts` "maps dead-symbols…")
  and must be updated in the same cycle, RED-first.
