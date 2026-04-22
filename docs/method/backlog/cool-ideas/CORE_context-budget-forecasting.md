---
title: "Context budget forecasting — estimate before you start"
feature: policy
kind: leaf
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Budget governor (shipped)"
  - "Session tracking (shipped)"
  - "file_outline tool (shipped)"
  - "graft_map tool (shipped)"
  - "Policy engine (shipped)"
acceptance_criteria:
  - "A `graft forecast <path>` command returns file count, estimated content size, and projected budget impact"
  - "Forecasts work for both directories and individual files"
  - "Forecast includes a recommendation for read strategy (e.g., map first, then targeted reads)"
  - "Forecast does not consume budget or trigger read events"
  - "Forecast accuracy is within 15% of actual budget consumption when the reads are subsequently executed"
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

## Implementation path

1. Add a `graft_forecast` MCP tool that accepts a path (file or directory)
2. For files: stat the file, run the policy engine in dry-run mode to determine what projection would fire (content/outline/refused), estimate output size
3. For directories: recursively enumerate files (respecting .graftignore), aggregate individual file forecasts, compute total budget impact
4. Include strategy recommendations based on the forecast: if budget impact > 20%, suggest map-first then targeted reads; if a single file, suggest direct read
5. Ensure forecast does NOT create observation cache entries or consume budget — pure read-only query against the filesystem and policy engine
6. Add remaining-budget context so the forecast shows "this would use X% of your Y remaining budget"

## Related cards

- **CORE_speculative-read-cost**: Speculative read cost is a per-file "what would this read cost?" preview. Forecasting is broader — it covers directories, includes strategy recommendations, and aggregates across multiple files. Forecasting subsumes speculative read cost for the directory case, but speculative read cost is more focused for single-file dry-run. Not a hard dependency in either direction — they could ship independently or forecasting could use speculative-read-cost internally.
- **CORE_policy-playground**: Policy playground ("what projection would fire?") overlaps with forecasting's per-file dry-run. Playground focuses on policy decisions; forecasting focuses on budget planning. Again, complementary rather than dependent.
- **CORE_self-tuning-governor**: Self-tuning analyzes historical metrics to suggest threshold changes. Forecasting predicts future budget consumption. Different temporal directions (past vs. future) of the same budget-awareness theme.
- **CORE_conversation-primer**: Primer could use forecasting internally to decide the right scope for the initial graft_map call. Not a hard dependency.

## No dependency edges

All prerequisites are shipped. Forecasting is a read-only query against the filesystem and policy engine — no new infrastructure needed. No other card requires forecasting as a prerequisite.

## Effort rationale

Medium. The per-file forecast is straightforward (run policy engine in dry-run mode, stat the file). The directory-level aggregation and strategy recommendations add design surface — how to present aggregated forecasts, what thresholds trigger which recommendations, how to handle deeply nested directories efficiently. Not large because no new primitives are needed.
