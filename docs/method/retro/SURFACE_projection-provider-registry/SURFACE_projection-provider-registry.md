---
title: "SURFACE: Projection provider registry"
cycle: "SURFACE_projection-provider-registry"
design_doc: "docs/design/SURFACE_projection-provider-registry.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Projection provider registry Retro

## Summary

Implemented a projection provider registry for buffer-native editor
integration. Hosts can now create a registry, register a provider by language id
and file extension, and pass that registry to `createStructuredBuffer(...)` or
`createProjectionBundle(...)`. The first binding arm routes Edict projection
through the existing `EdictProjectionProvider`, including case-insensitive
`.edict` extension routing and explicit `language: "edict"` routing for
synthetic dirty buffers.

The direct `edictProjector` option remains supported for compatibility. The
registry is instance-local and routing-only; it does not execute Echo, admit
bundles, implement Wesley SDL projection, or make Graft own language-specific
projection payloads.

## Playback Witness

Artifacts under `docs/method/retro/SURFACE_projection-provider-registry/witness`.

## What surprised you?

The first implementation correctly routed Edict but allowed two subtle registry
contract violations: language-only registrations with no extensions, and partial
mutation if extension validation failed after the language map had already been
updated. A self-review RED caught both before commit, and registration now
validates the complete language/extension set before mutating either lookup map.
The PR self-review also caught a docs overclaim around multiple provider
bindings and a blank-language throw path; both were repaired before merge.

## What would you do differently?

Start registry registration as a two-phase operation: normalize and validate all
keys first, then commit them to lookup maps. That shape is less clever and makes
failure atomic.

## Follow-up items

- Add Wesley SDL projection as the second registry-backed provider.
- Consider extracting a common language projection bundle shell once a second
  non-Edict payload exists.
