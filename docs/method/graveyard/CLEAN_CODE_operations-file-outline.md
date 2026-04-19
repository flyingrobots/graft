---
title: file outline operation still returns plain structural objects
lane: graveyard
legend: CLEAN
---

# file outline operation still returns plain structural objects

## Disposition

Retired by consolidation into the shared operations read-family result-variant seam. The remaining debt is about one common runtime result posture across governed read operations.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_operations-read-family-runtime-result-variants.md`

## Original Proposal

File: `src/operations/file-outline.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- operation outputs are interface-shaped rather than runtime-backed
- lawful degrade is correct, but the result model is still weakly structural

Desired end state:
- promote operation results to runtime-backed output types

Effort: S
