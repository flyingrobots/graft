---
title: metrics types are still interface-only
lane: graveyard
legend: CLEAN
---

# metrics types are still interface-only

## Disposition

Retired by consolidation into the shared metrics runtime-contract seam. The remaining debt is about unified runtime validation for metric events and deltas, not interface-only event types alone.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_metrics-runtime-contract-seams.md`

## Original Proposal

File: `src/metrics/types.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- metrics entries are interfaces only
- the logger path accepts structural data without constructor-enforced invariants

Desired end state:
- runtime-backed metrics event type with constructor validation

Effort: S
