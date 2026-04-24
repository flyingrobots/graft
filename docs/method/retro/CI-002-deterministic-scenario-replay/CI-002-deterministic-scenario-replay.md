# Retro: CI-002-deterministic-scenario-replay

## What shipped

`createSnapshotFs(files)` builds a mock FileSystem from a map.
`replayToolCalls(calls, handler)` drives recorded calls through a
handler and compares results.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| graft replay command re-drives against mock | ⚠️ Primitives exist, no CLI command |
| Identical tool-call sequences | ✅ replayToolCalls compares |
| FS and Git ports fully mocked | ⚠️ FS mocked, Git NOT mocked |
| At least one regression scenario in CI | ❌ None captured |

## Gaps

1. **No Git mock**: Only FileSystem is mocked via createSnapshotFs.
2. **No captured scenario**: No real regression test in the test suite.
3. **No CLI integration**: Just library primitives.

## Drift check

- createSnapshotFs implements FileSystem port interface ✅
- Pure replay function with handler callback ✅
