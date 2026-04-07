# MCP graft_diff tool still has thin typed boundaries

File: `src/mcp/tools/graft-diff.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler still decodes optional args from loose records and re-assembles structural output

Desired end state:
- runtime-backed request/result seam for structural diff queries

Effort: S
