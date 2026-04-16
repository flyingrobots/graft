---
title: bin/graft entrypoint has weak boundary typing
lane: graveyard
legend: CLEAN
---

# bin/graft entrypoint has weak boundary typing

## Disposition

Fixed in the current CLI cleanup slice: bin/graft.js is now a thin bootstrap shim that delegates to src/cli/entrypoint.ts rather than owning argument resolution and command dispatch.

## Original Proposal

File: `bin/graft.js`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- argv dispatch is stringly typed and hand-routed
- the JS entrypoint mixes loader bootstrap with product command routing

Desired end state:
- keep bootstrap concerns isolated from command selection
- make command dispatch flow through typed CLI contracts

Effort: S
