---
title: MCP read_range tool still bridges through loose args
lane: graveyard
legend: CLEAN
---

# MCP read_range tool still bridges through loose args

## Disposition

Retired by consolidation into the shared read-family DTO seam. The remaining debt is not specific to `read_range`; it is the common MCP read-family request/result runtime model gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-read-family-runtime-dto-seam.md`

## Original Proposal

File: `src/mcp/tools/read-range.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- range handler still consumes casted records and emits structural results

Desired end state:
- typed request/result seam for bounded range reads

Effort: S
