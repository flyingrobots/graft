---
title: MCP budget tool is still a thin record wrapper
lane: graveyard
legend: CLEAN
---

# MCP budget tool is still a thin record wrapper

## Disposition

Retired by consolidation into the shared small-tool runtime-model seam. The remaining debt is not unique to `budget`; it is the common diagnostic/admin artifact modeling gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-small-diagnostic-tool-runtime-models.md`

## Original Proposal

File: `src/mcp/tools/budget.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- validated input still collapses to a loose args record quickly

Desired end state:
- typed command DTO for budget-setting requests

Effort: S
