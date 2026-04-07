# MCP graft_since tool still has thin typed boundaries

File: `src/mcp/tools/since.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler still operates on loose args after schema parse

Desired end state:
- runtime-backed request/result seam for since queries

Effort: S
