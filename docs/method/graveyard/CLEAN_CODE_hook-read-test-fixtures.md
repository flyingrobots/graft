---
title: Hook read tests repeat fixture setup and assertions
lane: graveyard
legend: CLEAN
---

# Hook read tests repeat fixture setup and assertions

## Disposition

Fixed in the current cleanup slice: shared hook input builders, refusal parsing, governed-read guidance assertions, and temporary hook fixture helpers now live in test/helpers/hooks.ts instead of being duplicated across pretooluse, posttooluse, and parity tests.

## Original Proposal

Files:
- `test/unit/hooks/pretooluse-read.test.ts`
- `test/unit/hooks/posttooluse-read.test.ts`
- `test/unit/policy/cross-surface-parity.test.ts`

Non-green SSJR pillars:
- DRY 🟡

What is wrong:
- hook input builders, oversized-file setup, and repeated graft
  guidance assertions are duplicated across the hook unit tests and the
  parity witness
- adding one more governed-read branch will keep spreading the same
  fixtures and message checks across multiple files

Desired end state:
- shared hook test builders and focused assertion helpers for governed
  read, refusal, and backstop paths
- keep the user-visible hook contract explicit in each test without
  repeating the same fixture construction by hand

Effort: S
