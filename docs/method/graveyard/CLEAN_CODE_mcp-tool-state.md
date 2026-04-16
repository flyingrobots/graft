---
title: MCP state tools are still structurally typed
lane: graveyard
legend: CLEAN
---

# MCP state tools are still structurally typed

## Disposition

Retired by consolidation into the shared small-tool runtime-model seam. The remaining debt is not unique to `state`; it is the common diagnostic/admin artifact modeling gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-small-diagnostic-tool-runtime-models.md`

## Original Proposal

File: `src/mcp/tools/state.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- save/load handlers still encode session state responses as structural objects without stronger runtime models

Desired end state:
- explicit runtime-backed state command/result types

Effort: S
