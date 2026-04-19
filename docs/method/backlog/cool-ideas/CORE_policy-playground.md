---
title: "Policy playground — speculative reads without the cost"
legend: CORE
lane: cool-ideas
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
