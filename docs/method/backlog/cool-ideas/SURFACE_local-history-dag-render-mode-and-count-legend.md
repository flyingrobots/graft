---
title: "SURFACE local history dag render mode and count legend"
feature: surface
kind: leaf
legend: SURFACE
lane: cool-ideas
effort: S
requirements:
  - "diag local-history-dag command (shipped)"
  - "Bijou pipe-mode and dag-mode rendering (shipped)"
acceptance_criteria:
  - "DAG output header includes an explicit render mode label (e.g. 'render: bijou-pipe' vs 'render: bijou-dag')"
  - "Node and edge count semantics are clarified in the header when in compressed pipe-mode"
  - "An operator can immediately tell whether the DAG is in full layout or compressed mode"
  - "Count legend explains that pipe-mode lines may summarize multiple outgoing edges"
  - "No false impression of incomplete or malformed graph in pipe-mode output"
---

# SURFACE local history dag render mode and count legend

## Why

When `diag local-history-dag` degrades to Bijou pipe-mode, the visible line count is smaller than the underlying node and edge counts. That is truthful, but it is not self-explanatory, and it creates operator confusion about whether the graph is incomplete or malformed.

## Shape

- show render mode explicitly, for example `render: bijou-pipe` vs `render: bijou-dag`
- clarify count semantics in the header
- explain that compressed pipe-mode lines may summarize multiple outgoing edges

## Acceptance sketch

- an operator can immediately tell whether the DAG is in full layout mode or compressed pipe-mode
- node and edge counts no longer look inconsistent with the rendered listing

## Implementation path

1. Identify the DAG render path in the `diag local-history-dag` command where the output format is chosen (full dag-mode vs. compressed pipe-mode).
2. Add a `render:` header line to the output that explicitly names the active render mode (e.g., `render: bijou-dag` or `render: bijou-pipe`).
3. When in pipe-mode, add a count legend line explaining the relationship between visible lines and underlying graph structure: e.g., `legend: 12 nodes, 18 edges (pipe-mode: lines may summarize multiple edges)`.
4. When in dag-mode, the count legend is straightforward: `legend: 12 nodes, 18 edges`.
5. Test both modes with known graph sizes and verify that the header accurately reflects the render mode and counts.

## Related cards

- **SURFACE_terminal-activity-browser-tui**: Both are terminal presentation surfaces over Graft data. The TUI browser is a much broader surface; this card is a narrow UX fix for an existing command. No dependency.
- **CI-001-causal-collapse-visualizer**: The collapse visualizer would render a different kind of DAG (causal collapse). This card addresses the existing local-history DAG. Different data, different rendering concerns. No dependency.

## No dependency edges

All prerequisites are shipped. This is a UX improvement to an existing command — adding header metadata to clarify render mode. No other card must ship first, and no downstream card depends on this.

## Effort rationale

Small. This is a presentation-layer change to an existing command. The render mode and count data are already available at the point where the DAG is formatted — the work is adding a header line and a legend line. No new computation, no new data sources, no architectural changes.
