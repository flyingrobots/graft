---
title: Public CLI errors are too terse
lane: graveyard
legend: CLEAN
---

# Public CLI errors are too terse

## Disposition

Fixed in the current CLI cleanup slice: global parse errors plus serve, init, index, and generic command failures now emit actionable usage and docs guidance instead of terse failure text.

## Original Proposal

Files:
- `src/cli/main.ts`
- `src/cli/init.ts`
- `src/cli/index-cmd.ts`

Non-green SSJR pillars:
- Boundary validation 🟡
- Behavior on type 🟡

What is wrong:
- CLI failures usually print bare `Error: ...` lines without usage
  hints, next steps, or a docs pointer
- common mistakes like bad subcommands or missing flags are technically
  detected but not guided

Desired end state:
- add command-aware usage help and actionable next steps for common CLI
  failures
- include a stable docs pointer for operator-facing CLI errors

Effort: S
