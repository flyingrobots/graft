# MCP code_show tool is still request-light

File: `src/mcp/tools/code-show.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- precision show flow still bridges from validated input to loose records quickly

Desired end state:
- runtime-backed request/result seam for symbol focus reads

Effort: S
