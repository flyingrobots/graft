---
title: "Terminal activity browser TUI"
legend: SURFACE
lane: cool-ideas
effort: L
requirements:
  - "activity_view command (shipped)"
  - "diag local-history-dag command (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "Attribution and evidence footprints in activity items (shipped)"
  - "Bijou TUI framework (shipped)"
acceptance_criteria:
  - "A single command launches a terminal UI with timeline, DAG, and inspector panes"
  - "Keyboard navigation allows selecting sessions, strands, epochs, and paths"
  - "Selecting an activity item in the timeline reveals corresponding WARP support nodes and edges"
  - "Truncation, degraded posture, and shared-worktree state are visually obvious"
  - "No --json flag required to inspect recent activity"
  - "The TUI gracefully degrades if the terminal is too narrow for multi-pane layout"
---

# Terminal activity browser TUI

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

## Implementation path

1. Design the pane layout: timeline (left), DAG (center), inspector (right). Define minimum terminal width for multi-pane mode and fallback single-pane mode for narrow terminals.
2. Build the timeline pane: query `activity_view` for recent activity items, render as a scrollable list with session grouping. Highlight active/completed sessions, truncation markers, and degraded posture indicators.
3. Build the DAG pane: render `diag local-history-dag` output using Bijou dag-mode. Show commit nodes, sym nodes, and edge relationships. Selection in the timeline pane drives DAG focus.
4. Build the inspector pane: when a timeline item or DAG node is selected, show attribution details, evidence footprints, anchors, and related WARP edges. Use Bijou accordion or tree components for nested data.
5. Implement keyboard navigation: arrow keys for list navigation, tab for pane switching, enter for expanding/drilling, q for quit. Follow standard TUI conventions.
6. Add graceful degradation: detect terminal width/height at startup, switch to single-pane tabbed mode if below threshold. Handle resize events.
7. Integration test: launch TUI against a repo with known activity, verify that all panes render without error and that keyboard navigation reaches expected items.

## Related cards

- **SURFACE_local-history-dag-render-mode-and-count-legend**: The DAG pane would consume the render mode label and count legend that this card proposes. Complementary — the TUI would benefit from clearer DAG rendering, but neither blocks the other. The TUI can render whatever mode the DAG command currently outputs.
- **SURFACE_bijou-tui-for-graft-daemon-control-plane** (v0.7.0): Both are Bijou-based TUI surfaces. They share framework infrastructure but serve different domains (activity browsing vs daemon control). If the daemon TUI ships first, its patterns (pane layout, keyboard nav, degradation) become reusable for the activity browser.
- **CORE_session-knowledge-map**: The "what do I know?" query could feed the inspector pane when a session is selected. Not a dependency — the inspector can show raw activity/attribution data without a knowledge map surface.
- **SURFACE_ide-native-graft-integration**: IDE integration and TUI are parallel presentation surfaces for overlapping data. No dependency — they serve different environments (IDE vs terminal operator).

## No dependency edges

All prerequisites are shipped. The `activity_view` and `diag local-history-dag` commands provide the data; Bijou provides the rendering framework. No other card must ship first, and no other card is blocked waiting for this TUI.

## Effort rationale

Large. The individual panes are each M-ish (query existing data, render with Bijou), but the multi-pane coordination, keyboard navigation system, graceful degradation, and the general polish required for a TUI that humans will actually use push this to L. TUIs have a long tail of edge cases (terminal size, color support, resize behavior, accessibility).
