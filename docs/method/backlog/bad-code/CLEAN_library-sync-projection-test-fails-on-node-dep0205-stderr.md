---
title: "Library sync projection test fails on Node DEP0205 stderr"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-06-18
---

# Library sync projection test fails on Node DEP0205 stderr

## Problem

`test/unit/library/index.test.ts` expects the spawned `node --import tsx`
projection-bundle smoke test to emit empty stderr. On the current local Node
runtime, that subprocess exits successfully but writes:

```text
[DEP0205] DeprecationWarning: `module.register()` is deprecated. Use `module.registerHooks()` instead.
```

The assertion fails even though the library payload and exit status are
correct.

## Risk

Broad local validation can fail for an ambient Node loader deprecation warning
instead of a Graft behavior regression. That makes `pnpm test:local` noisy and
can hide real library-surface failures behind environment stderr churn.

## Desired Outcome

The regression test keeps proving the sync projection bundle is non-throwing
before parser warmup without treating known Node loader deprecation warnings as
Graft stderr output.

## Acceptance Criteria

- The test still fails on nonzero subprocess exit.
- The test still validates the parse-status JSON payload.
- Known Node `[DEP0205] module.register()` loader deprecation warnings do not
  fail the test.
- Unexpected stderr remains visible or fails the test.
