# MCP explain tool is still structurally typed

File: `src/mcp/tools/explain.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- reason explanations are still plain objects keyed by strings

Desired end state:
- explicit runtime-backed explanation artifact

Effort: S
