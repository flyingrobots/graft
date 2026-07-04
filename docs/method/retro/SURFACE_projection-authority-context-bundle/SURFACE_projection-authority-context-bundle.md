---
title: "SURFACE: Projection authority context in bundles"
cycle: "SURFACE_projection-authority-context-bundle"
design_doc: "docs/design/SURFACE_projection-authority-context-bundle.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Projection authority context in bundles Retro

## Summary

Added the common projection authority slot to warm projection bundles and wired
`ProjectionProfileResolver` through `createStructuredBuffer(...)` and
`createProjectionBundle(...)`.

The slice keeps the authority boundary intact:

- no resolver supplied yields `authority: { state: "not_configured" }`;
- resolved profiles are returned in the bundle;
- resolver failures are returned as structured projection results;
- provider invocation is skipped when authority resolution fails;
- registry-routed providers receive the same resolved authority context;
- Graft does not interpret Wesley SDL, descriptor semantics, Echo execution, Jim
  admission, settlement, or reintegration authority.

## Playback Witness

Artifacts under
`docs/method/retro/SURFACE_projection-authority-context-bundle/witness`.

## What surprised you?

The existing `WarmProjectionBundleResult` was the right public shell. The
change stayed small because `ProjectionProfileResolver` already had stable
structured failure and authority shapes.

## What would you do differently?

Add the authority slot at the same time as the resolver in future slices. The
extra hop was useful for review, but the two surfaces are designed to fit
together.

## Follow-up items

- Add profile config discovery and TOML parsing.
- Add provider capability checks for unsupported profile languages and
  extension sets.
- Add the profile-aware Wesley SDL provider.
- Add the wrong-profile SDL fixture that proves Graft routes and Wesley
  interprets.
