---
title: MCP code_refs tool is still orchestration-heavy
lane: graveyard
legend: CLEAN
---

# MCP code_refs tool is still orchestration-heavy

## Disposition

Retired by consolidation into the shared symbol-query and precision seam. The remaining debt is a common execution-strategy/orchestration problem across symbol query tools.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_symbol-query-and-precision-tool-seams.md`

## Original Proposal

File: `src/mcp/tools/code-refs.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- the tool currently owns request normalization, pattern building,
  engine fallback, preview filtering, policy filtering, and response
  assembly in one module

Desired end state:
- split text-fallback search execution and match filtering into smaller
  seams so the tool focuses on request translation and response
  contract

Effort: M
