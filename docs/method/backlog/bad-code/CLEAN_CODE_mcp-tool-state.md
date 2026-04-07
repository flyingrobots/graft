# MCP state tools are still structurally typed

File: `src/mcp/tools/state.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- save/load handlers still encode session state responses as structural objects without stronger runtime models

Desired end state:
- explicit runtime-backed state command/result types

Effort: S
