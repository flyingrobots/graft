# Retro: WARP_dead-symbol-detection

## What shipped

`findDeadSymbols(ctx, options?)` — query that finds symbols removed
from the codebase and never re-added. Returns name, kind, filePath,
exported, and removedInCommit for each dead symbol.

## Implementation

Snapshot-diff approach: for each commit in tick order, compare
sym-node sets at tick-1 vs tick. Symbols present before but absent
after are removals. Track removals in a Map; if a symbol reappears
at a later tick, delete it from the Map. Remaining entries are dead.

This avoids relying on `removes` edges directly (which are ephemeral
— the target sym node is tombstoned in the same patch, making the
edge invisible to post-patch observers).

`maxCommits` option limits search depth by scoping to the last N
commits in tick order.

## Tests (5)

1. No removals → empty result
2. Symbol removed and not re-added → detected
3. Removed then re-added → excluded
4. maxCommits limits search depth
5. Removals across multiple files

## Adaptation from wrecking crew branch

Agent used `WarpHandle` directly. Adapted to `WarpContext` +
`observeGraph()` convention to match structural-queries.ts pattern.
Changed `WarpObserverLens` to `Lens` (git-warp native type).

## What to watch

- Performance: creates 2 observers per commit in scope. For repos
  with thousands of commits, maxCommits should be used to bound cost.
