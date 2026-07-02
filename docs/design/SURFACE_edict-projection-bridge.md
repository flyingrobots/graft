# SURFACE: Edict projection bridge

## Hill

`jedit` and other editor hosts can ask Graft to project dirty `.edict` buffer
text through Edict's public JSONL projection CLI and receive syntax spans,
diagnostics, Core review, Target IR review, and canonical digests without
writing the buffer to disk.

## Problem

Graft already owns editor-facing warm projection composition. Edict now owns an
authoritative `project` operation that accepts source text on stdin and emits
structured JSONL projection records. Without a Graft-side bridge, editor hosts
must either shell out to Edict themselves or treat `.edict` as an unsupported
plain buffer, duplicating projection protocol knowledge outside the projection
broker.

## Acceptance Criteria

- `.edict` paths are recognized explicitly by the buffer projection layer.
- A caller can provide dirty buffer text and an editor-head basis to Graft and
  receive an Edict projection bundle with that basis preserved.
- Graft invokes Edict through the existing `ProcessRunner` port and stdin JSONL;
  it does not require the source file to exist on disk.
- Edict syntax span byte offsets are mapped to Graft row/column ranges using
  UTF-8 byte boundaries.
- Edict diagnostics remain compiler projection data, not process failures.
- Core and Target IR projection slots preserve Edict's `available`, `blocked`,
  and `failed` state truth instead of hiding absence behind optional fields.
- The default adapter does not make Edict a runtime npm dependency of Graft.
- Tests use fake process runners and pure projection fixtures; they do not
  require a live `edict` binary.

## Playback Questions

- Does `createProjectionBundle("demo.edict", source, { edictProjector })`
  return syntax spans for an unsaved buffer?
- Does the same `.edict` buffer report a dedicated unavailable reason when no
  Edict projector is configured?
- Does the direct Edict projection API preserve the caller's editor-head basis?
- Do multibyte characters before Edict syntax or diagnostic spans map to the
  correct Graft points?
- Do Core and Target IR slots distinguish not requested, available, blocked,
  and failed states?
- Does a CLI invocation failure fail as a bridge error instead of pretending to
  be a compiler diagnostic?

## Non-goals

- Do not execute Echo.
- Do not admit bundles.
- Do not claim Edict verifier completeness.
- Do not freeze Edict JSONL schemas in Graft; Edict remains the schema owner.
- Do not add a general target plugin registry to Graft.
- Do not make Graft responsible for deciding whether a jedit run button is
  enabled.

## Test Strategy

- Unit-test the pure Edict JSONL projection decoder with fixture records.
- Unit-test `StructuredBuffer` with an injected fake Edict projector.
- Unit-test the Edict CLI adapter with an injected fake `ProcessRunner`.
- Run focused library/adapter tests, then `pnpm typecheck`, `pnpm lint`, and
  the relevant release surface gate.
