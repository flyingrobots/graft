# MCP file_outline tool still bridges through loose records

File: `src/mcp/tools/file-outline.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler/output path is still mostly structural after schema parse

Desired end state:
- typed request/result seam for outline retrieval

Effort: S
