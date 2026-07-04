---
title: "SURFACE: Profile-aware Wesley SDL provider"
cycle: "SURFACE_profile-aware-wesley-sdl-provider"
design_doc: "docs/design/SURFACE_profile-aware-wesley-sdl-provider.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Profile-aware Wesley SDL provider Retro

## Summary

Added the first profile-aware non-Edict provider seam. Projection registries can
now register a Wesley provider for `.graphql` and `.graphqls` buffers. When a
`ProjectionProfileResolver` resolves `wesley-sdl` authority, Graft passes dirty
buffer text, basis, the emit set, and the exact `ResolvedAuthorityContext` to
the Wesley provider.

The slice preserves the authority boundary:

- Graft routes by profile and provider registration;
- Wesley receives the authority context and owns interpretation;
- Wesley syntax and diagnostics feed the common projection shell;
- Wesley payload lanes are preserved on `StructuredBuffer.wesleyProjection()`;
- wrong-profile diagnostics remain provider-owned;
- provider failures become `PROJECTION_PROVIDER_UNAVAILABLE`;
- no TOML discovery, Wesley CLI/WASM transport, Echo execution, Jim admission,
  settlement, or reintegration authority was added.

## Playback Witness

Artifacts under
`docs/method/retro/SURFACE_profile-aware-wesley-sdl-provider/witness`.

## What surprised you?

The core implementation was small because the prior resolver and authority slot
did the right preparatory work. The main self-review catch was partial-state
truth: a Wesley provider can report an error status even when it does not emit a
diagnostic or blocked payload slot, and Graft must still mark the snapshot
partial.

## What would you do differently?

Add the provider status partial test in the first RED batch. It is a compact
truth-table case and belongs beside the wrong-profile diagnostic test.

## Follow-up items

- Add project config discovery and `graft.projections.toml` parsing.
- Add a real Wesley CLI, WASM, LSP, or LSM transport adapter behind this
  provider contract.
- Add provider capability checks for unsupported profile languages and
  extension sets.
- Add jedit UI that renders Wesley authority context and payload lanes.
