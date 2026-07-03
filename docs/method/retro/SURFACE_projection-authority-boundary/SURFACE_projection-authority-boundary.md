---
title: "SURFACE: Projection authority boundary"
cycle: "SURFACE_projection-authority-boundary"
design_doc: "docs/design/SURFACE_projection-authority-boundary.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Projection authority boundary Retro

## Summary

Recorded the projection authority boundary before adding a second
registry-backed provider. The design packet freezes the invariant that Graft may
know which Wesley profile applies, but must not know what that profile means.

The packet separates profile identity from routing identity:

- `ProjectionProfile` and `profileDigest` bind authority context.
- `ProjectionRoute` and `routingDigest` bind buffer selection rules.
- `ResolvedAuthorityContext` records what governed a specific projection
  request.

The slice is documentation-only. It does not add profile config parsing,
Wesley projection, jedit UI, Echo execution, Jim admission, settlement, or
reintegration authority.

## Playback Witness

Artifacts under
`docs/method/retro/SURFACE_projection-authority-boundary/witness`.

## What surprised you?

The existing registry design already warned against provider option sprawl, but
it did not distinguish authority identity from route identity. That distinction
matters before Wesley enters the registry because Wesley extension profiles
carry domain semantics while route globs only decide which buffers are sent to
that authority context.

## What would you do differently?

The projection provider registry packet could have named the authority-context
layer explicitly as future work. It stayed correctly scoped to Edict routing,
but the next design needed to recover the larger vocabulary before introducing
profile-aware providers.

## Follow-up items

- Implement project profile config and deterministic authority-context
  resolution.
- Add the common authority context shell to projection bundles.
- Add the profile-aware Wesley SDL provider contract and wrong-profile boundary
  fixture.
