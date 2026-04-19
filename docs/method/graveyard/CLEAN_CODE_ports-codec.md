---
title: codec port is too weakly specified at runtime
lane: graveyard
legend: CLEAN
---

# codec port is too weakly specified at runtime

## Disposition

Retired by consolidation into the shared port runtime-contract seam. The remaining debt is about common runtime guarantees across environment-facing ports, not `codec` alone.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_port-runtime-contract-seams.md`

## Original Proposal

File: `src/ports/codec.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- the port is interface-only, so runtime guardrails depend on discipline rather than construction

Desired end state:
- tighten the codec port contract with stronger runtime expectations or guarded adapters

Effort: S
