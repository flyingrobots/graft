# MCP metrics accepts raw numeric deltas without runtime guards

File: `src/mcp/metrics.ts`

Non-green SSJR pillars:
- Boundary validation 🟡

What is wrong:
- metric accumulation methods accept raw numbers and assume callers only
  pass nonnegative byte counts and cache deltas
- one bad caller can silently corrupt cumulative burden totals and
  session metrics

Desired end state:
- runtime-backed metric delta helpers or constructor-validated
  nonnegative value objects on the accumulation path

Effort: S
