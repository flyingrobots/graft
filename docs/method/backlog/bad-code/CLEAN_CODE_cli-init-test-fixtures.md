# CLI init tests repeat client bootstrap fixtures and assertions

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
