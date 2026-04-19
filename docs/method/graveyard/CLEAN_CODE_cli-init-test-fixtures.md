---
title: CLI init tests repeat client bootstrap fixtures and assertions
lane: graveyard
legend: CLEAN
---

# CLI init tests repeat client bootstrap fixtures and assertions

## Disposition

Fixed in the current CLI cleanup slice: repeated init test helpers and graft-server config assertions now live in test/helpers/init.ts instead of being duplicated inline across the init CLI suite.

## Original Proposal

File: `test/unit/cli/init.test.ts`

Non-green SSJR pillars:
- DRY 🟡

What is wrong:
- client bootstrap setup, merge verification, and file-content checks
  are repeated across many examples with only the target path and
  config shape changing
- adding another bootstrap target or behavior variant will keep
  extending the same repetitive test structure

Desired end state:
- shared helpers for client bootstrap setup and idempotence assertions
- keep the client-specific expectations explicit without rebuilding the
  same temp-file patterns in each test

Effort: S
