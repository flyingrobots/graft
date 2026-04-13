---
title: "METHOD drift test discovery misses repo playback tests"
legend: CLEAN
lane: bad-code
---

# METHOD drift test discovery misses repo playback tests

`method_drift` reported playback-question drift for cycle 0069 even though the playback questions exactly matched assertions in `test/unit/mcp/structural-policy.test.ts`. Its output said it scanned `tests/**/*.test.*` and `tests/**/*.spec.*`, which did not cover the repo’s existing `test/` suite. A temporary playback witness was added under `tests/method/0069-graft-map-bounded-overview.test.ts` so the cycle could close lawfully, but the drift tool should discover repo-local test layouts without requiring duplicate witnesses.
