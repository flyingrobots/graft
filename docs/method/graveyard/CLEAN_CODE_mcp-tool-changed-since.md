---
title: MCP changed_since tool still routes through loose args
lane: graveyard
legend: CLEAN
---

# MCP changed_since tool still routes through loose args

## Disposition

Retired by consolidation into the shared read-family DTO seam. The remaining debt is not specific to `changed_since`; it is the common MCP read-family request/result runtime model gap.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_mcp-read-family-runtime-dto-seam.md`

## Original Proposal

File: `src/mcp/tools/changed-since.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- handler logic still consumes casted records rather than a stronger request object

Desired end state:
- typed request/result seam for changed-since queries

Effort: S
