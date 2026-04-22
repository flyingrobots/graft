---
title: "Speculative read cost estimate"
feature: policy
kind: leaf
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "Budget governor with projection decisions (shipped)"
  - "Policy engine (shipped)"
  - "safe_read tool (shipped)"
  - "Session tracking (shipped)"
acceptance_criteria:
  - "A `peek` mode on safe_read or a separate `read_cost` tool returns cost preview without consuming budget"
  - "Preview includes: projected byte count, projection type (content/outline/refused), and remaining budget fraction"
  - "Preview does not trigger a read event or count toward session observations"
  - "Cost estimate matches the actual cost within 10% when the read is subsequently executed"
---

# Speculative read cost estimate

Before an agent commits to reading a file, graft returns a cost
preview: how many bytes would this read consume, what projection
would fire (content/outline/refused), and what fraction of remaining
budget it would cost.

Decision support, not enforcement. The agent can make an informed
choice before spending context.

Could be a lightweight `peek` mode on safe_read, or a separate
`read_cost` tool.

## Implementation path

1. Extract the policy engine's projection-decision logic into a pure, side-effect-free function that computes the projection type and estimated output size for a given file path without creating an observation cache entry or deducting budget.
2. Implement as either: (a) a `peek: true` parameter on `safe_read` that short-circuits after the decision, or (b) a separate `read_cost` MCP tool. Option (b) is cleaner — separates the "ask" from the "do."
3. Return a structured result: `{ projection, estimatedBytes, budgetFraction, remainingBudget }`.
4. Ensure determinism: calling `read_cost` then `safe_read` on the same file in the same session state must produce the same projection and a byte count within 10%.
5. No side effects: no observation cache entry, no budget deduction, no session event logged.

## Related cards

- **CORE_policy-playground**: Nearly identical concept. Policy playground proposes `graft preview` that returns projection, reason, estimated bytes, and budget impact without consuming budget. Speculative read cost proposes `read_cost` or `peek` mode. These are the same feature described from different angles — a deduplication candidate. If both ship, they should be merged into one tool. Not a dependency — they are alternative implementations of the same idea.
- **CORE_context-budget-forecasting**: Forecasting operates at directory scope ("how much would reading `src/mcp/` cost?"). Speculative read cost operates at file scope. Forecasting could use speculative read cost internally for per-file estimates, but forecasting also includes strategy recommendations and directory-level aggregation that go beyond file-level cost previews. Not a hard dependency in either direction.
- **CORE_self-tuning-governor**: Self-tuning analyzes historical metrics to suggest threshold changes. Speculative read cost predicts future single-read cost. Different temporal directions (past analysis vs. future prediction). No dependency.
- **CORE_capture-range**: Capture range governs access to capture output via opaque handles. Speculative read cost previews the budget impact of reads. Orthogonal governance mechanisms. No dependency.

## No dependency edges

All prerequisites are shipped. The policy engine already computes projection decisions with all the data this tool would return — the work is exposing that computation without side effects. No other card requires speculative read cost as a prerequisite, and no backlog card must ship first.

## Effort rationale

Small. The policy engine already makes projection decisions that include the projection type, reason, and file size. The work is: (a) extracting that decision path into a side-effect-free function (refactoring, not new logic), and (b) wiring it as a new MCP tool or parameter. No new algorithms, no new data sources, no new infrastructure.
