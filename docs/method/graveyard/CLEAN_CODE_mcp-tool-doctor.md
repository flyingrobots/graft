---
title: MCP doctor tool is still structurally typed
lane: graveyard
legend: CLEAN
---

# MCP doctor tool is still structurally typed

## Disposition

Retired by consolidation into the shared small-tool runtime-model seam. The remaining debt is not unique to `doctor`; it is the common diagnostic/admin artifact modeling gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-small-diagnostic-tool-runtime-models.md`

## Original Proposal

File: `src/mcp/tools/doctor.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- doctor output is assembled as a structural object without a dedicated runtime model

Desired end state:
- explicit runtime-backed health snapshot type

Effort: S
