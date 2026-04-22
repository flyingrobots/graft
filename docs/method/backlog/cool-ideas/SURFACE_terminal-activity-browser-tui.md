---
title: SURFACE terminal activity browser TUI
lane: cool-ideas
legend: SURFACE
requirements:
  - "activity_view command (shipped)"
  - "diag local-history-dag command (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "Attribution and evidence footprints in activity items (shipped)"
acceptance_criteria:
  - "A single command launches a terminal UI with timeline, DAG, and inspector panes"
  - "Keyboard navigation allows selecting sessions, strands, epochs, and paths"
  - "Selecting an activity item in the timeline reveals corresponding WARP support nodes and edges"
  - "Truncation, degraded posture, and shared-worktree state are visually obvious"
  - "No --json flag required to inspect recent activity"
  - "The TUI gracefully degrades if the terminal is too narrow for multi-pane layout"
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
