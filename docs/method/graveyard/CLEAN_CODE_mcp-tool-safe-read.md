---
title: MCP safe_read tool still bridges through loose records
lane: graveyard
legend: CLEAN
---

# MCP safe_read tool still bridges through loose records

## Disposition

Retired by consolidation into the shared read-family DTO seam. The remaining debt is not specific to `safe_read`; it is the common MCP read-family request/result runtime model gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-read-family-runtime-dto-seam.md`

## Original Proposal

File: `src/mcp/tools/safe-read.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler still turns validated input into record-based branching and structural response assembly

Desired end state:
- runtime-backed request/result seam for governed reads

Effort: S
