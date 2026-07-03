---
title: "SURFACE: Projection profile config resolver"
cycle: "SURFACE_projection-profile-config-resolver"
design_doc: "docs/design/SURFACE_projection-profile-config-resolver.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Projection profile config resolver Retro

## Summary

Added the first executable piece of projection authority-context resolution:
an in-memory `ProjectionProfileResolver` that resolves dirty-buffer names from
explicit profile overrides, project route globs, or extension fallbacks.

The resolver keeps the authority boundary intact:

- `profileDigest` binds profile id, language id, provider id, semantic
  extension coordinates and digests, and semantic provider options.
- `routingDigest` binds profile id plus include and exclude globs.
- Route-only changes do not move `profileDigest`.
- Profile semantic changes do move `profileDigest`.
- Blank profile overrides are absence-shaped input.
- Unknown profiles, ambiguous routes, and no-provider outcomes are structured
  failures.

The slice intentionally remains pure and in-memory. It does not parse
`graft.projections.toml`, attach authority context to `StructuredBuffer`, add a
Wesley provider, or interpret Wesley/Echo/Edict descriptor semantics.

## Playback Witness

Artifacts under
`docs/method/retro/SURFACE_projection-profile-config-resolver/witness`.

## What surprised you?

The resolver initially reused the adapter-layer canonical JSON codec and Node
crypto. The hexagonal import guard correctly rejected that from
`src/operations`. The fix was to keep the resolver in the operations layer and
make its digest path local and deterministic, with tests comparing its output
to the repo canonical JSON codec plus SHA-256 oracle.

## What would you do differently?

The first RED test should have pinned exact digest oracle values, not only
hash-shaped review strings. That stricter assertion was added before the final
gate so digest generation is behavioral evidence rather than shape evidence.

## Follow-up items

- Add project config discovery and TOML parsing around the pure resolver.
- Add authority context to projection requests and bundles.
- Add provider capability checks for unsupported profile languages,
  unsupported extension sets, and unavailable profile providers.
- Add the profile-aware Wesley SDL provider and wrong-profile boundary fixture.
