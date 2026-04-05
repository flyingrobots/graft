# Invariant: Delta-Only Storage

**Status:** Enforced (architectural)
**Legend:** WARP

## What must remain true

WARP persistence stores structural deltas, not full AST snapshots,
except at explicit checkpoints.

## Why it matters

The storage model's entire claim is that cost tracks structural
churn, not raw byte bulk. If somebody stuffs full AST blobs into
every tick, the system has betrayed its own premise and storage
grows linearly with repo size instead of with structural entropy.

## How to check

- Ordinary ticks contain patch ops (addNode, tombstone, setProperty),
  not whole-tree snapshots
- Checkpoint policy is explicit and bounded (not every tick)
- Storage growth follows changed files/symbols, not repo byte size
- Test: index N commits, verify patch count scales with changed
  files, not total files
