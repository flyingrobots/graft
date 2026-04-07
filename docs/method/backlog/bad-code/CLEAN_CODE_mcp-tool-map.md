# MCP graft_map tool still has thin typed boundaries

File: `src/mcp/tools/map.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- map aggregation still consumes loose args and emits structural objects directly

Desired end state:
- runtime-backed request/result seam for structural map queries

Effort: S
