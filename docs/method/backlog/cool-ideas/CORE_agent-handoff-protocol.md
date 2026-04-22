---
title: "Agent handoff protocol — structured session transfer"
legend: CORE
lane: cool-ideas
requirements:
  - "Session tracking (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "Observation cache (shipped)"
  - "causal_attach tool (shipped)"
acceptance_criteria:
  - "Graft produces a structured handoff JSON when an agent session ends or hits its context limit"
  - "Handoff includes filesRead, symbolsInspected, filesModified, plannedButNotDone, and budgetConsumed"
  - "A new agent session can ingest the handoff and resume with full provenance"
  - "Handoff is a projection over existing WARP graph and session state, not new infrastructure"
---

# Agent handoff protocol — structured session transfer

When an agent hits its context limit or finishes a phase, graft could produce a structured handoff:

```json
{
  "handoff": {
    "filesRead": ["src/mcp/server.ts", "src/mcp/context.ts", ...],
    "symbolsInspected": ["createGraftServer", "ToolContext", ...],
    "filesModified": ["src/mcp/tools/map.ts"],
    "plannedButNotDone": ["update CHANGELOG", "run release:check"],
    "causalWorkspace": { "sessionId": "...", "checkoutEpoch": 0 },
    "observations": 47,
    "budgetConsumed": "68%"
  }
}
```

The next agent picks up with full provenance instead of starting from scratch. The WARP graph + persisted local history already has the data — this is a projection over existing state, not new infrastructure.

Pairs with `causal_attach` for explicit handoff evidence.
