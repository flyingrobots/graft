---
title: SURFACE terminal activity browser TUI
lane: cool-ideas
legend: SURFACE
---

# SURFACE terminal activity browser TUI

## Why

`graft diag activity` and `graft diag local-history-dag` are useful, but they still force operators to choose between summary text and raw graph/debug output. A terminal-first browser would let humans inspect local causal history, WARP relationships, and attribution/evidence without dropping into raw JSON or mentally reconstructing state from separate commands.

## Shape

- timeline pane for recent local activity items
- DAG pane for bounded WARP local-history structure
- inspector pane for attribution, evidence, footprints, anchors, and next-action guidance
- keyboard navigation over sessions, strands, epochs, and paths

## Acceptance sketch

- a human can launch one command from a repo and inspect recent activity without needing `--json`
- the surface makes truncation, degraded posture, and shared-worktree state obvious
- local-history event selection can reveal the corresponding WARP support nodes and edge relationships
