---
title: "Symbol heatmap"
feature: structural-metrics
kind: leaf
legend: WARP
lane: cool-ideas
effort: M
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Session tracking (shipped)"
  - "Observation cache (shipped)"
acceptance_criteria:
  - "Tracks which symbols trigger outlines or re-reads most frequently across sessions"
  - "Produces a ranked list of hot symbols by observation frequency"
  - "Hot symbols are surfaced to agents and humans to highlight where context pressure concentrates"
  - "Heatmap data is queryable via API (not just visual output)"
---

# Symbol heatmap

Derive from metrics: which symbols trigger outlines or re-reads most
often? Surface hot symbols to help agents (and humans) understand
where context pressure concentrates.

## Implementation path

1. Instrument the observation cache to record per-symbol access
   events with timestamps
2. Persist aggregated counts across sessions (new storage — the
   current observation cache is per-session)
3. Query interface: ranked list of symbols by observation frequency,
   filterable by time window
4. API exposure so agents can consume heatmap data programmatically

The key implementation challenge is cross-session persistence.
Current session tracking and observation cache are per-session.
Aggregating across sessions requires a new persistence layer —
likely a simple append-only log or SQLite table alongside the
WARP graph.

## Related cards

- **WARP_rulial-heat-map**: Despite the similar name, completely
  different. Rulial heat map compares structural *divergence between
  branches*. Symbol heatmap tracks *observation frequency across
  sessions*. No overlap.
- **CORE_auto-focus**: Could consume heatmap data as an input
  signal (hot symbols are more likely to be relevant). But
  auto-focus works without it — it uses request context, not
  historical frequency. Nice-to-have, not a hard dependency.
- **CORE_context-budget-forecasting**: Heatmap could improve
  forecasts (predict which symbols an agent will need based on
  history). But forecasting works from file sizes and session
  depth thresholds alone. Not a hard dependency.
- **WARP_minimum-viable-context**: Heatmap suggests what's
  frequently needed; MVC computes what's structurally needed.
  Different approaches to the same goal. Not a hard dependency.

## No dependency edges

This card is standalone. All prerequisites are shipped, and no
other card requires symbol-heatmap as a hard prerequisite. The
cards that could benefit from it (auto-focus, budget-forecasting,
MVC) all have independent implementations that don't require
frequency data.

## Effort rationale

Medium. Per-symbol instrumentation is straightforward. The new
cross-session persistence layer is the main work — needs design
decisions about storage format, retention policy, and aggregation
strategy.
