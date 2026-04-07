# MCP code_find tool is still request-light

File: `src/mcp/tools/code-find.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- schema parsing exists, but handler internals still pivot on loose args and structural response assembly

Desired end state:
- runtime-backed request model for precision search

Effort: S
