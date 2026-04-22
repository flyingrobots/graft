---
title: "Session knowledge map — what do I already know?"
legend: CORE
lane: cool-ideas
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
