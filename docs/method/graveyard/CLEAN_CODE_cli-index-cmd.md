---
title: CLI index command is still boundary-thin
lane: graveyard
legend: CLEAN
---

# CLI index command is still boundary-thin

## Disposition

Fixed in the current CLI cleanup slice: index now has an explicit runtime command/result model and truthful JSON vs text error behavior instead of ad hoc argument parsing and output shaping.

## Original Proposal

File: `src/cli/index-cmd.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- flag parsing is still hand-rolled
- result typing is still plain-object oriented instead of runtime-backed

Desired end state:
- move command parsing onto a typed CLI argument model
- promote structured CLI results from ad hoc objects to stronger runtime shapes

Effort: S
