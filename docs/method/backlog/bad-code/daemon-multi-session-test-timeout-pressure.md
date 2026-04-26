---
title: daemon multi-session test can exceed unit-test timeout under full-suite load
feature: mcp-daemon
kind: trunk
legend: BAD_CODE
effort: S
requirements:
  - "In-process daemon shared session tests"
acceptance_criteria:
  - "`test/unit/mcp/daemon-multi-session.test.ts` completes within the normal unit-test timeout under full-suite load"
  - "The test either uses narrower fixtures or carries an explicit integration-style timing budget"
  - "Assertions continue to prove daemon-wide workspace authorization and bound session sharing"
---

## What

During WARP materialization-query validation, the first full `pnpm test` run
timed out in:

```text
test/unit/mcp/daemon-multi-session.test.ts
```

The failed test passed in isolation in `4.11s`, and the next full `pnpm test`
run passed. That points to suite-load timing pressure rather than a
deterministic behavior regression.

## Why it matters

This test sits near the default `5s` unit-test timeout under load, so unrelated
changes can surface as noisy daemon failures. The assertions are valuable, but
the fixture/runtime budget should match the work the test actually performs.
