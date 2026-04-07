# MCP changed_since tool still routes through loose args

File: `src/mcp/tools/changed-since.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler logic still consumes casted records rather than a stronger request object

Desired end state:
- typed request/result seam for changed-since queries

Effort: S
