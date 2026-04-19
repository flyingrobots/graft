---
title: MCP explain tool is still structurally typed
lane: graveyard
legend: CLEAN
---

# MCP explain tool is still structurally typed

## Disposition

Retired by consolidation into the shared small-tool runtime-model seam. The remaining debt is not unique to `explain`; it is the common diagnostic/admin artifact modeling gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-small-diagnostic-tool-runtime-models.md`

## Original Proposal

File: `src/mcp/tools/explain.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- reason explanations are still plain objects keyed by strings

Desired end state:
- explicit runtime-backed explanation artifact

Effort: S
