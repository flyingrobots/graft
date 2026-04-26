---
title: "WARP materialization query latency"
cycle: "WARP_materialization-query-latency"
source_backlog: "docs/method/backlog/bad-code/warp-materialization-query-latency.md"
outcome: hill-met
drift_check: yes
---

# WARP materialization query latency Retro

## Summary

The residual WARP latency blocker is cleared for the single-symbol difficulty
surface that exposed it.

The root cause was two stacked replay paths:

- Graft opened `graft-ast` without a git-warp `checkpointPolicy`, so cold
  materialization replayed the full writer chain.
- `symbolTimeline` used detached ceiling observers per commit tick. git-warp
  deliberately bypasses checkpoints for ceiling reads, so even after a
  checkpoint existed, timeline reads still replayed historical patch chains.

`graft symbol difficulty observeGraph --path src/warp/context.ts --json` now
reports `latencyMs: 327` on the local `release/v0.7.0` graph.

## What Shipped

- `openWarp()` now passes a default `checkpointPolicy` for the `graft-ast`
  graph.
- A focused regression proves materializing after enough patches creates
  `refs/warp/graft-ast/checkpoints/head`.
- `symbolTimeline` now uses provenance-backed patch reads for exact/live symbol
  timelines: `patchesFor(entityId)` plus `loadPatchBySha(sha)`.
- The detached ceiling-observer timeline path was removed rather than kept as a
  compatibility branch.

## Validation

- Focused timeline/open/difficulty/blame tests pass.
- The live difficulty query that previously reported `latencyMs: 40695` now
  reports `latencyMs: 327`.
- The local graph now has a checkpoint ref at
  `refs/warp/graft-ast/checkpoints/head`.

See `witness/verification.md` for command output and timing.

## Follow-On Pressure

Removed-symbol history now requires an explicit `filePath`, because otherwise
the caller has not identified a concrete `sym:<path>:<name>` entity.
