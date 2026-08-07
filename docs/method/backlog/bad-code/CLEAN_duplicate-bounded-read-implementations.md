---
title: "Bounded-read logic exists in two implementations that can drift"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-08-02
---

# Bounded-read logic exists in two implementations that can drift

## Problem

`readRangeFromContent` in `src/mcp/tools/precision-live.ts` reimplements the
body of `readRange` in `src/operations/read-range.ts`: the same
`MAX_RANGE_LINES` bound, the same truncation flag, the same EOF clipping, the
same `INVALID_RANGE` guard. Found while routing `code_show` back through the
single read authority (#228).

`wrapWithPolicyCheck` has the same shape of problem: two copies, one in
`src/mcp/repo-tool-worker-context.ts` and one in `src/mcp/server-tool-access.ts`,
each independently reading the file to evaluate policy.

## Risk

Two implementations of a bound is two places to fix when the bound changes, and
nothing makes them fail together. A range limit that drifts between the direct
tool path and the WARP path means the same request answers differently
depending on which path served it, which is exactly the class of divergence the
single-read-authority work exists to remove.

## Repair sketch

`readRangeFromContent` and `readRange` should be one function over
`ObservedFile`; the WARP path already has content in hand, so it can build the
observation rather than keep a parallel projector. The two policy wrappers
should collapse into one, and now that `safe_read`, `file_outline`, and
`read_range` all evaluate policy inside `RepoWorkspace`, that wrapper may have
no remaining callers worth keeping.
