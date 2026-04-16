---
title: MCP file_outline tool still bridges through loose records
lane: graveyard
legend: CLEAN
---

# MCP file_outline tool still bridges through loose records

## Disposition

Retired by consolidation into the shared read-family DTO seam. The remaining debt is not specific to `file_outline`; it is the common MCP read-family request/result runtime model gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-read-family-runtime-dto-seam.md`

## Original Proposal

File: `src/mcp/tools/file-outline.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler/output path is still mostly structural after schema parse

Desired end state:
- typed request/result seam for outline retrieval

Effort: S
