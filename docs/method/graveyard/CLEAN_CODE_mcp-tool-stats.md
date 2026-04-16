---
title: MCP stats tool is still structurally typed
lane: graveyard
legend: CLEAN
---

# MCP stats tool is still structurally typed

## Disposition

Retired by consolidation into the shared small-tool runtime-model seam. The remaining debt is not unique to `stats`; it is the common diagnostic/admin artifact modeling gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-small-diagnostic-tool-runtime-models.md`

## Original Proposal

File: `src/mcp/tools/stats.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- stats response is assembled as a plain object rather than an explicit runtime-backed metrics snapshot

Desired end state:
- runtime-backed stats artifact

Effort: S
