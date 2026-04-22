---
title: "Context budget forecasting — estimate before you start"
legend: CORE
lane: cool-ideas
requirements:
  - "Budget governor (shipped)"
  - "Session tracking (shipped)"
  - "file_outline tool (shipped)"
  - "graft_map tool (shipped)"
acceptance_criteria:
  - "A `graft forecast <path>` command returns file count, estimated content size, and projected budget impact"
  - "Forecasts work for both directories and individual files"
  - "Forecast includes a recommendation for read strategy (e.g., map first, then targeted reads)"
  - "Forecast does not consume budget or trigger read events"
---

# Context budget forecasting — estimate before you start

Before an agent starts a task, graft could estimate the cost:

```
graft forecast src/mcp/
  → 47 files, ~180KB content, ~35 outlines needed
  → Budget impact: 36% of 500KB budget
  → Recommendation: use graft_map depth=1 first, then targeted reads
```

vs:

```
graft forecast src/mcp/server.ts
  → 1 file, ~8KB, fits in content projection
  → Budget impact: 1.6%
```

Proactive, not reactive. Agents can plan their read strategy before committing budget. Uses file sizes from the filesystem + session depth thresholds to predict projections.
