# Invariant: Causal Events Carry Explicit Footprints

**Status:** Planned
**Legend:** WARP

## What must remain true

Any event that can participate in causal collapse must carry an
explicit footprint.

A footprint may start as a file set and later grow into a symbol set or
finer semantic region, but it cannot remain only an opaque tool-call
blob.

## Why it matters

Slice-based collapse only works if Graft can tell what an event
actually touched or observed. Without explicit footprints, collapse
either drags in unrelated history or invents certainty it does not
have.

## How to check

- provenance-capable events expose a bounded footprint model
- staged-target or commit-target collapse can select included events
  using those footprints
- receipts may summarize tool calls, but the underlying causal model is
  not limited to whole-tool-call granularity
