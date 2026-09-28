---
title: "Test cleanup rejection skips the caller's own cleanup"
feature: tests
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-09-28
---

# Test cleanup rejection skips the caller's own cleanup

## Problem

`cleanupTestRepo` can now reject: a non-transient removal error, or `ENOTEMPTY` or `EBUSY` that outlasts its retries. Some callers await it first in a `finally` and remove their own temp directories after it, for example `fs.rmSync(binDir)` in `test/integration/cli/git-graft-enhance-cli.test.ts`. When it rejects, those later removals are skipped.

## Risk

Temp directories are left behind on a test run that is already failing. The failure is reported, so no wrong verdict results, only leftover directories.

## Desired Outcome

A rejected `cleanupTestRepo` does not prevent a caller's other cleanup.

## Acceptance Criteria

- Callers that remove other temp directories after `cleanupTestRepo` run those removals whether or not it rejects, and still surface its rejection.
- A test injects a rejecting remover and shows the caller's own directory is removed.
