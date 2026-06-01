---
title: "Method close can time out without producing retro artifacts"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-06-01
---

# Method close can time out without producing retro artifacts

## Problem

During closure for `CORE_graft-structural-history-echo-package-descriptor`,
`method_close` timed out after 120 seconds and produced no local retro files.
The cycle had to be closed manually from PR, CI, and drift evidence.

## Risk

Cycle closure becomes non-deterministic at exactly the point where the repo
expects an audit trail. Operators can lose confidence in whether retro artifacts
were written, partially written, or omitted, and agents may waste time
reconstructing evidence manually.

## Evidence

- Cycle: `CORE_graft-structural-history-echo-package-descriptor`
- Method drift result was clean before close.
- `method_close` timed out after 120 seconds.
- `git status --porcelain` showed no generated files after the timeout.
- Manual retro packet:
  `docs/method/retro/CORE_graft-structural-history-echo-package-descriptor/`

## Desired Outcome

`method_close` should either complete within a bounded time and write the retro
packet, or fail fast with a specific, actionable error before doing any work.

## Acceptance Criteria

- A timeout path reports the current phase that stalled.
- No-output failures are distinguishable from partial-write failures.
- The tool can be retried safely after a timeout.
- A focused regression covers the no-artifact timeout path or its nearest
  controllable seam.
