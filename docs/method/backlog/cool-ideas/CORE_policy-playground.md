---
title: "Policy playground — speculative reads without the cost"
legend: CORE
lane: cool-ideas
requirements:
  - "Budget governor with projection decisions (shipped)"
  - "Policy engine (shipped)"
  - "Session tracking (shipped)"
acceptance_criteria:
  - "A `graft preview <path>` tool returns projection, reason, estimated bytes, and budget impact without consuming budget"
  - "Preview does not trigger a read event or observation cache entry"
  - "Preview output matches what an actual read would produce (same projection, same reason)"
  - "Agents can call preview on multiple files to plan a read strategy before committing"
---

# Policy playground — speculative reads without the cost

An MCP tool where agents can ask "what would happen if I tried to read this file?" without actually reading it:

```
graft preview src/mcp/server.ts
  → projection: outline (file is 263 lines, exceeds 150-line threshold)
  → estimatedBytes: ~3200
  → budgetImpact: 0.6%
  → suggestion: use read_range with jump table for targeted access
```

Returns the projection, reason, estimated bytes, and budget impact — without consuming budget or triggering a read event. Agents can plan before committing.

Like `dry-run` for reads. The policy engine already computes all this — we just discard it when the file isn't actually read.
