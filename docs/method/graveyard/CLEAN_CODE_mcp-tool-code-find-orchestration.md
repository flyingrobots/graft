---
title: MCP code_find tool still mixes source selection and response shaping
lane: graveyard
legend: CLEAN
---

# MCP code_find tool still mixes source selection and response shaping

## Disposition

Retired by consolidation into the shared symbol-query and precision seam. The remaining debt is a common execution-strategy/orchestration problem across symbol query tools.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_symbol-query-and-precision-tool-seams.md`

## Original Proposal

File: `src/mcp/tools/code-find.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- explicit request validation now exists, but the handler still owns
  WARP/live source selection, visibility filtering, and response
  shaping in one branchy flow

Desired end state:
- move search execution and visibility filtering behind smaller seams so
  the tool focuses on request translation and final response framing

Effort: S
