---
title: read range operation is still interface-first
lane: graveyard
legend: CLEAN
---

# read range operation is still interface-first

## Disposition

Retired by consolidation into the shared operations read-family result-variant seam. The remaining debt is about one common runtime result posture across governed read operations.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_operations-read-family-runtime-result-variants.md`

## Original Proposal

File: `src/operations/read-range.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Behavior on type 🟡

What is wrong:
- range result and failure states are plain objects with string reasons

Desired end state:
- explicit runtime-backed range result / error variants

Effort: S
