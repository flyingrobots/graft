---
title: filesystem port is still interface-only
lane: graveyard
legend: CLEAN
---

# filesystem port is still interface-only

## Disposition

Retired by consolidation into the shared port runtime-contract seam. The remaining debt is about common runtime guarantees across environment-facing ports, not `filesystem` alone.

Replacement: `docs/method/backlog/bad-code/CLEANCODE_port-runtime-contract-seams.md`

## Original Proposal

File: `src/ports/filesystem.ts`

Non-green SSJR pillars:
- Runtime truth 🟡
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- the most important environment seam remains interface-only
- runtime boundary guarantees rely on adapters and caller discipline rather than the port itself

Desired end state:
- strengthen port boundary guarantees with runtime guards and clearer bounded-artifact expectations

Effort: S
