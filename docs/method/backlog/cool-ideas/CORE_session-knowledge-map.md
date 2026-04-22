---
title: "Session knowledge map — what do I already know?"
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "Observation cache (shipped)"
  - "Session tracking (shipped)"
  - "activity_view tool (shipped)"
  - "changed_since tool (shipped)"
acceptance_criteria:
  - "A `graft known` tool returns files read, symbols inspected, and per-directory coverage for the current session"
  - "Stale entries (files modified since last read) are flagged"
  - "Never-read directories are listed explicitly"
  - "Agents can query 'do I have enough context?' before issuing additional reads"
  - "Coverage percentages are based on file count within each directory"
---

# Session knowledge map — what do I already know?

Graft already tracks reads per session. What if it could answer "what do I already know?"

```
graft known
  → 12 files read this session
  → 47 symbols inspected
  → Coverage: src/mcp/ (8/23 files), src/operations/ (3/12 files)
  → Stale: src/mcp/server.ts (modified since last read)
  → Never read: src/warp/*, src/cli/*
```

The anti-duplicate-read. Context already consumed is context you don't need to re-consume. Agents can ask "do I already have enough context for this task?" before reading more.

Uses the observation cache + activity_view data that already exists.

## Implementation path

1. Add a `graft_known` MCP tool that queries the observation cache for the current session
2. Aggregate observations by directory: count files read vs. total files, list symbols inspected
3. Cross-reference with `changed_since` to flag stale entries — files that were modified after the agent's last read
4. Enumerate directories with zero observations as "never read"
5. Format output as a compact coverage summary (directory → files read / total files, staleness markers)
6. Optionally accept a path argument to scope the knowledge map to a subtree

## Related cards

- **CORE_agent-handoff-protocol**: Handoff serializes knowledge-map-equivalent data for a different agent. If knowledge map ships first, handoff can derive its payload from the knowledge map query. Not a hard dependency — handoff can query the observation cache directly — but knowledge map would make handoff implementation cleaner.
- **CORE_auto-focus**: Auto-focus uses observation history to infer intent; knowledge map presents observation history to the agent. Same data source, different consumers (machine inference vs. agent query). Independent.
- **WARP_semantic-drift-in-sessions**: Drift detection tracks reading paths and flags interpretation shifts. Knowledge map shows coverage. Both read observation history but answer different questions ("what might I misunderstand?" vs. "what have I seen?"). Independent.
- **WARP_session-filtration**: Filtration adapts projections based on accumulated knowledge. Knowledge map surfaces that same accumulated knowledge to the agent. Complementary but not dependent.
- **CORE_context-budget-forecasting**: Forecasting predicts future budget impact; knowledge map reports past consumption. Together they give the agent a complete picture: "here's what I've spent, here's what this next task would cost." Independent.

## No dependency edges

All prerequisites are shipped. The knowledge map is a read-only query over the observation cache and filesystem — no new infrastructure, no dependencies on unshipped cards. No downstream card requires the knowledge map as a hard prerequisite.

## Effort rationale

Small. The observation cache already tracks everything needed. This card is a query and presentation layer over existing data — aggregate by directory, cross-reference with changed_since for staleness, format as a summary. No new indexing, no new data collection, no complex inference.
