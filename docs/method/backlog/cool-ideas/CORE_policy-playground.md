---
title: "Policy playground — speculative reads without the cost"
legend: CORE
lane: cool-ideas
effort: S
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

## Implementation path

1. Extract the policy engine's projection-decision logic into a pure function that returns the decision without side effects (no observation cache write, no budget deduction, no read event).
2. Register a new MCP tool `graft_preview` that calls this pure decision function.
3. Return a structured result: `{ projection, reason, estimatedBytes, budgetImpact, suggestion }`.
4. The suggestion field provides actionable guidance ("use read_range for targeted access", "file is small enough for full content", etc.).
5. Ensure the preview result is deterministic — calling preview then actually reading produces the same projection and reason.
6. No observation cache entry, no budget deduction, no session event.

## Related cards

- **CORE_speculative-read-cost**: Nearly identical concept. Speculative-read-cost proposes a `peek` mode on `safe_read` or a separate `read_cost` tool. Policy-playground proposes `graft preview`. These are the same feature described from different angles. If both were built, they should be merged into one tool. Not a dependency — a deduplication candidate.
- **CORE_context-budget-forecasting**: Forecasting operates at directory scope ("how much would reading `src/mcp/` cost?"). Playground operates at file scope ("what projection would this file get?"). Complementary granularities. Forecasting could use playground internally for per-file estimates.
- **CORE_graft-as-teacher**: The teacher adds hints to governor responses. Preview responses could also include teaching hints ("try file_outline first"). Independent but naturally composable.
- **CORE_policy-profiles**: Preview would respect whichever profile is active. Independent.

## No dependency edges

Standalone. The policy engine already computes projection decisions — this card exposes that computation without the side effects. No other card requires playground as a prerequisite.

## Effort rationale

Small. The policy engine already makes projection decisions with all the data this tool would return. The work is extracting that decision path into a side-effect-free function and wiring it as a new MCP tool. No new algorithms, no new data sources.
