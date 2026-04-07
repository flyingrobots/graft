# MCP budget tool is still a thin record wrapper

File: `src/mcp/tools/budget.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- validated input still collapses to a loose args record quickly

Desired end state:
- typed command DTO for budget-setting requests

Effort: S
