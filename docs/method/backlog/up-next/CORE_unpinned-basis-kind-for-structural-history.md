# Unpinned committed-history bases deserve their own basis kind

## Context

Slice 4's mapping sends a dead-symbols reading with no `ref`/`head` to
`basisKind: GIT_REF` with `refName: null` — asserting a ref-based basis
that names no ref. The schema's `StructuralBasisKind` has no value for
"committed history, not pinned to a ref or commit", and `LIVE_FRONTIER`
would be wrong (the read is over committed history). Recorded as gate-
section item 2 in the slice 4 design packet; James sanctioned the rename
(2026-06-11).

## Desired outcome

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

## Constraints

- Schema change → coordinate with the Wesley pin and the
  `graft-structural-history` manifest digest; same-commit regeneration.
- Slice 4's parity tests pin the current behavior
  (`test/unit/echo/generated-model-parity.test.ts` "maps dead-symbols…")
  and must be updated in the same cycle, RED-first.
