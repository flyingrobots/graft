---
title: "SURFACE: Edict projection bridge"
cycle: "SURFACE_edict-projection-bridge"
design_doc: "docs/design/SURFACE_edict-projection-bridge.md"
outcome: hill-met
drift_check: manual
---

# SURFACE: Edict projection bridge Retro

## Summary

Implemented the Edict projection bridge for Graft. Added a pure Edict JSONL
projection decoder, a ProcessRunner-backed Edict CLI adapter, `.edict` buffer
recognition, optional `edictProjector` support on `StructuredBuffer` and
`createProjectionBundle`, public root exports, docs, changelog, and regression
coverage. The bridge accepts dirty buffer text, sends Edict stdin JSONL, maps
Edict byte offsets to Graft row/column spans, preserves diagnostics, and exposes
Core and Target IR projection slots without executing Echo or admitting
bundles.

## Playback Witness

Artifacts under `docs/method/retro/SURFACE_edict-projection-bridge/witness`.

## What surprised you?

The full suite caught a parser-status regression introduced while adding the
new `.edict` unavailable state. `PARSER_RUNTIME_NOT_READY` must remain a
partial parse state, while a missing Edict projector is unsupported. The repair
kept those states distinct. A local Node deprecation warning from the `tsx`
loader also made the library test brittle; the child process now suppresses
external loader deprecation noise for that narrow contract test.

## What would you do differently?

Start the decoder with explicit requested-slot absence handling. The final
implementation now treats a requested-but-omitted Edict projection record as a
failed slot instead of conflating it with `not_requested`.

## Follow-up items

- None.
