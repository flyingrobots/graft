# MCP safe_read tool still bridges through loose records

File: `src/mcp/tools/safe-read.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler still turns validated input into record-based branching and structural response assembly

Desired end state:
- runtime-backed request/result seam for governed reads

Effort: S
