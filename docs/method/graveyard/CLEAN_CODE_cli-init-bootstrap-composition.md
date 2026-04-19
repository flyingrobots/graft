---
title: CLI init bootstrap composition is concentrated in one file
lane: graveyard
legend: CLEAN
---

# CLI init bootstrap composition is concentrated in one file

## Disposition

Fixed in the current CLI cleanup slice: src/cli/init.ts is now a thin command root, with bootstrap/document mutation moved into src/cli/init-bootstrap.ts and rendering moved into src/cli/init-render.ts.

## Original Proposal

File: `src/cli/init.ts`

Non-green SSJR pillars:
- SOLID 🟡

What is wrong:
- one file owns repo scaffolding, agent instruction snippets, JSON
  config mutation, TOML append semantics, Claude hook wiring, Codex
  bootstrap behavior, and human-facing init output
- every new client bootstrap path tends to accrete more branching onto
  the same orchestration seam

Desired end state:
- separate repo scaffolding, per-client bootstrap adapters, and
  human-facing init rendering into smaller modules
- keep `runInit()` as a thin composition root rather than the place
  where every client-specific write path grows

Effort: M
