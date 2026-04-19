---
title: "71 test files use heavy inline fixtures instead of shared helpers"
legend: CLEAN_CODE
lane: bad-code
---

# 71 test files use heavy inline fixtures instead of shared helpers

Source: test audit 2026-04-19

55% of test files define all setup data inline — context factories with 10+ fields, repeated `mkdtemp` calls, inline `createBufferWriter()` definitions — when shared helpers already exist or should be extracted.

Worst offenders:
- `persisted-local-history.test.ts` (910 LoC, 13 mkdtemp calls)
- `layered-worldline.test.ts` (456 LoC)
- `precision.test.ts` (494 LoC)
- `init.test.ts` (487 LoC)
- `indexer.test.ts` (472 LoC)

Fix direction:
- Extract `createBufferWriter()` users to import from `test/helpers/init.ts` (4 files)
- Create `test/helpers/temp.ts` with `createTestDir()` wrapper
- Create domain-specific context factories (causal, history, receipt)
- Reduce `persisted-local-history.test.ts` from 13 to 2-3 shared fixtures

Effort: M
