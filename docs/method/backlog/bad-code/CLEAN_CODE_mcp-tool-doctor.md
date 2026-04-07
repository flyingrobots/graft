# MCP doctor tool is still structurally typed

File: `src/mcp/tools/doctor.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- doctor output is assembled as a structural object without a dedicated runtime model

Desired end state:
- explicit runtime-backed health snapshot type

Effort: S
