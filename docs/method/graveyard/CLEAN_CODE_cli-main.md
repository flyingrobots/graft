---
title: CLI main is accumulating orchestration weight
lane: graveyard
legend: CLEAN
---

# CLI main is accumulating orchestration weight

## Disposition

Retired because the exact file-level claim is stale. CLI parsing and peer-command execution were split out, so `main.ts` is no longer the orchestration hotspot described by this note.

## Original Proposal

File: `src/cli/main.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡
- SOLID 🟡

What is wrong:
- one file now owns help text, global arg parsing, grouped subcommand parsing, MCP tool bridging, and output emission
- command args are still decoded from `string[]` into loose records

Desired end state:
- split parser, router, and presenter responsibilities
- replace loose `Record<string, unknown>` command args with runtime-backed command DTOs

Effort: M
