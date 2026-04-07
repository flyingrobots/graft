# MCP read_range tool still bridges through loose args

File: `src/mcp/tools/read-range.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- range handler still consumes casted records and emits structural results

Desired end state:
- typed request/result seam for bounded range reads

Effort: S
