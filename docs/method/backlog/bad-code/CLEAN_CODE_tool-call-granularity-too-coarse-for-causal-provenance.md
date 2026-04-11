# Tool-call granularity is too coarse for causal provenance

Files likely involved:
- `src/mcp/server.ts`
- `src/mcp/receipt.ts`
- `src/mcp/metrics.ts`
- `src/session/tracker.ts`
- `src/mcp/repo-tool-job.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- current runtime observability, receipts, and session tracking are
  mostly shaped around whole tool calls
- one tool call can read many files, inspect symbols, shift intent, and
  write only one target, but the current event model does not preserve
  provenance-ready footprints at that granularity
- worker job envelopes preserve execution context, not a durable causal
  event model

Why this matters now:
- the product direction now depends on causal-slice collapse rather than
  whole-session replay
- coarse tool-call logging will either drag in too much irrelevant
  history or miss the edges needed to explain a staged artifact
- this is especially acute for agent workflows, where one session may
  explore broadly before changing a very small target

Desired end state:
- receipts and metrics stay as projections over execution, not the whole
  provenance model
- a lower-level event schema can capture path/symbol footprints, actor
  identity, checkout epoch, and optional intent/decision edges when
  needed
- tool-call records become containers or summaries, not the only causal
  facts available

Related:
- `docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md`
- `docs/method/backlog/cool-ideas/WARP_agent-action-provenance.md`
- `docs/method/backlog/cool-ideas/WARP_intent-and-decision-events.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-receipt.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_mcp-metrics-boundaries.md`

Effort: M
