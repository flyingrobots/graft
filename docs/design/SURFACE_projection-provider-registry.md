# SURFACE: Projection provider registry

## Hill

Editor hosts can register supported projection provider bindings once and let
Graft route dirty-buffer projection requests by extension or explicit language
id, without adding a new top-level `createStructuredBuffer` option for every
projected language.

## Problem

The Edict bridge proved that Graft can broker authoritative language projection
over dirty editor buffers. Its first API shape is intentionally direct:
`edictProjector`. Repeating that shape for Wesley SDL, Colorful, or future
projection authorities would turn buffer construction into option sprawl and
would couple editor hosts to every language-specific parameter.

Graft needs a small registry seam that normalizes provider routing while keeping
language semantics and transport details owned by each provider. This slice adds
the registry shell and the current Edict provider binding; other language
bindings remain future work.

## Acceptance Criteria

- Hosts can create a projection registry and register the supported Edict
  provider binding with a language id plus one or more file extensions.
- `createStructuredBuffer(...)` and `createProjectionBundle(...)` accept the
  registry without breaking the existing `edictProjector` option.
- Registry routing is deterministic and case-insensitive for extensions.
- An explicit language id can override extension routing for dirty buffers with
  synthetic names.
- Blank language ids are treated as absent at the buffer boundary.
- Existing Edict projection behavior still works when routed through the
  registry.
- Existing direct `edictProjector` behavior remains supported for compatibility.
- If no provider matches, `.edict` buffers keep the current
  `PROJECTION_PROVIDER_UNAVAILABLE` result instead of falling back to a parser
  or pretending to be unsupported plain text.
- The registry is a routing shell only. Language-specific payloads remain owned
  by their provider contracts.

## Playback Questions

- Can a registry route `demo.edict` to the existing Edict provider and preserve
  the Edict projection bundle?
- Can the same registry route `DEMO.EDICT` with the same result?
- Can an explicit language id route a synthetic buffer name with no extension?
- Does a direct `edictProjector` still work without a registry?
- Does an unmatched `.edict` buffer still report
  `PROJECTION_PROVIDER_UNAVAILABLE`?
- Does the public root package export the registry factory and types?

## Non-goals

- Do not implement Wesley SDL projection in this slice.
- Do not implement Colorful projection through this registry in this slice.
- Do not add Echo execution, admission, or runtime coordination.
- Do not make Graft parse Edict, Wesley SDL, or Colorful semantics itself.
- Do not remove `edictProjector`; migration should be additive.
- Do not introduce a global mutable provider registry.

## Test Strategy

- Unit-test registry routing and extension normalization directly.
- Unit-test `StructuredBuffer` with a registry-routed Edict provider.
- Unit-test explicit language-id routing for synthetic dirty buffers.
- Unit-test public API exports for the new registry surface.
- Run focused registry/structured-buffer/library tests, then typecheck, lint,
  build, release surface gate, whitespace check, and the full isolated suite.
