# MCP run_capture mixes shell orchestration and output shaping

File: `src/mcp/tools/run-capture.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- shell execution, logging-path management, truncation logic, and response shaping all live together

Desired end state:
- separate shell capture adapter concerns from response shaping
- strengthen runtime result types for capture output

Effort: M
