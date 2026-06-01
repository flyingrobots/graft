# Structural History Evidence Label Alignment

Status: active implementation packet.

Source card:
[`docs/method/backlog/asap/CORE_structural-history-evidence-label-alignment.md`](../method/backlog/asap/CORE_structural-history-evidence-label-alignment.md)

## Hill

Graft structural readings carry the same evidence-label taxonomy as the
canonical structural-history schema, so current git-warp readings cannot be
mistaken for future Echo-native witnesshood.

## Acceptance Criteria

- `StructuralReadingPort` evidence can carry `echo-native`,
  `git-warp-imported`, and `fallback-translated` labels.
- Graft can map those labels to the Wesley-generated
  `StructuralEvidenceKind` values.
- Current git-warp-backed structural readings are labeled
  `fallback-translated`.
- Current git-warp-backed structural readings keep
  `nativeContinuumWitness: false`.
- Public command behavior remains unchanged.
- No Echo repository change is required.

## Playback Questions

1. Can a reviewer see the exact Graft evidence label on a structural reading?
2. Can current git-warp fallback readings be distinguished from future imported
   git-warp facts?
3. Can current git-warp-backed readings ever masquerade as `echo-native`?
4. Does the implementation avoid changing Echo, Wesley semantics, and public
   command output?

## Non-goals

- Do not claim any current Graft reading is Echo-native.
- Do not add a real Echo runtime, package descriptor, or fake Echo client.
- Do not remove git-warp fallback behavior.
- Do not change the canonical GraphQL schema unless the current schema lacks the
  required labels.
- Do not change public API, CLI, or MCP output shapes.

## Test Strategy

- Add focused unit coverage for the `StructuralReadingPort` evidence label
  taxonomy and generated-schema mapping.
- Extend git-warp structural-reading adapter tests to assert
  `fallback-translated` evidence labels.
- Keep this slice local to Graft.
