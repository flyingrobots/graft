---
title: "Agent handoff protocol — structured session transfer"
legend: CORE
lane: cool-ideas
effort: M
requirements:
  - "Session tracking (shipped)"
  - "WARP Level 1 indexing (shipped)"
  - "Observation cache (shipped)"
  - "causal_attach tool (shipped)"
  - "state_save / state_load tools (shipped)"
  - "Budget governor (shipped)"
acceptance_criteria:
  - "Graft produces a structured handoff JSON when an agent session ends or hits its context limit"
  - "Handoff includes filesRead, symbolsInspected, filesModified, plannedButNotDone, and budgetConsumed"
  - "A new agent session can ingest the handoff and resume with full provenance"
  - "Handoff is a projection over existing WARP graph and session state, not new infrastructure"
  - "Handoff preserves causal workspace identity so the new session can attach to the same causal chain"
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

## Implementation path

1. Define the handoff schema: filesRead, symbolsInspected, filesModified, plannedButNotDone, causalWorkspace, observations, budgetConsumed
2. Add a `graft_handoff` MCP tool that queries the observation cache and session state to produce the handoff JSON
3. Include the current causal workspace identity so the receiving agent can `causal_attach` to the same chain
4. Add an `ingest_handoff` path that accepts a handoff JSON and pre-populates the new session's observation cache and context
5. Wire handoff generation into session-end lifecycle (context limit hit, explicit agent request, or graceful shutdown)
6. Validate round-trip: produce handoff, start new session, ingest handoff, verify the new agent has equivalent structural awareness

## Related cards

- **CORE_cross-session-resume**: Complementary but independent. Resume is for the SAME agent returning to a saved state. Handoff is for transferring TO a different agent. Both use `state_save` (shipped) but for different purposes — resume loads your own prior state, handoff packages state for someone else.
- **CORE_session-knowledge-map**: The knowledge map ("what do I know?") is exactly the data that feeds the handoff payload. Knowledge map is a query tool for the current agent; handoff serializes that same data for a different agent. Not a hard dependency — handoff can query the observation cache directly — but if knowledge map ships first, handoff becomes trivially derived from it.
- **CORE_conversation-primer**: Primer orients a NEW session from scratch. Handoff orients a session that continues existing work. They serve different lifecycle moments (cold start vs. warm transfer) and could coexist.
- **CORE_multi-agent-conflict-detection**: If multiple agents are active and one hands off to another, conflict detection ensures the receiving agent knows about concurrent modifications. Not a hard dependency — handoff works without it — but they pair well in multi-agent workflows.

## No dependency edges

All prerequisites are shipped. The handoff is a projection over existing observation cache, session state, and causal workspace data. No other card must ship first, and no other card is blocked waiting for handoff.

## Effort rationale

Medium. The schema design and observation-cache query are straightforward (S), but ingestion on the receiving end — pre-populating session state, wiring into the session lifecycle, and validating round-trip fidelity — adds integration surface that pushes this to M.
