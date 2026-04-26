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
reports `latencyMs: 349` on the local `release/v0.7.0` graph.

## What Shipped

- `openWarp()` now passes a default `checkpointPolicy` for the `graft-ast`
  graph.
- A focused regression proves materializing after enough patches creates
  `refs/warp/graft-ast/checkpoints/head`.
- `symbolTimeline` skips legacy `commit:*` nodes without numeric WARP ticks.
- `symbolTimeline` now uses provenance-backed patch reads for exact/live symbol
  timelines: `patchesFor(entityId)` plus `loadPatchBySha(sha)`.
- The timeline path no longer uses detached ceiling observers for the common
  exact-symbol query used by structural blame and refactor difficulty.

## Validation

- Focused timeline/open/difficulty/blame tests pass.
- The live difficulty query that previously reported `latencyMs: 40695` now
  reports `latencyMs: 349`.
- The local graph now has a checkpoint ref at
  `refs/warp/graft-ast/checkpoints/head`.

See `witness/verification.md` for command output and timing.

## Follow-On Pressure

`symbolTimeline` still has a legacy ceiling fallback for unresolved
no-file-path, no-live-symbol cases. That preserves removed-symbol behavior for
callers that only have a symbol name, but it is not the preferred path for hot
truth surfaces.
