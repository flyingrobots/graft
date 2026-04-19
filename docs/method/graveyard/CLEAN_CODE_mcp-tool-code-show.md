---
title: MCP code_show tool is still request-light
lane: graveyard
legend: CLEAN
---

# MCP code_show tool is still request-light

## Disposition

Retired by consolidation into the shared symbol-query and precision seam. The remaining debt is a common execution-strategy/orchestration problem across symbol query tools.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_symbol-query-and-precision-tool-seams.md`

## Original Proposal

File: `src/mcp/tools/code-show.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- precision show flow still bridges from validated input to loose request state quickly
- the handler still owns ref resolution, live/WARP fallback, visibility filtering, ambiguity handling, and final response shaping

Desired end state:
- runtime-backed request/result seam for symbol focus reads
- split resolution, filtering, and response assembly into smaller strategy seams

Effort: S
