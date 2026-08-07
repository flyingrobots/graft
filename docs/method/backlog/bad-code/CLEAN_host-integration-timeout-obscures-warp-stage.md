---
title: "Host integration timeout obscures the slow WARP stage"
feature: test-infrastructure
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: S
status: open
reported: 2026-08-06
---

# Host integration timeout obscures the slow WARP stage

## Problem

Host-side precision integration tests share Vitest's generic five-second
per-test ceiling even though each fixture creates a Git repository, opens a
Git-WARP graph, indexes one or two commits, constructs an MCP server, and only
then exercises the product assertion.

During PR #242 review closure, two default-timeout runs of
`test/unit/mcp/precision.test.ts` failed in existing WARP-backed cases:

- `uses WARP for indexed historical reads` timed out at 5.10 seconds;
- `supports case-insensitive substring discovery on indexed clean-head repos`
  timed out at 5.00 seconds.

The fixtures are tiny. The first contains one file, one function, and two
commits. The second contains one file, two classes, and one commit. Both use
the installed `@git-stunts/git-warp` 16.0.0 runtime.

The unchanged 20-test file passed with a one-off 15-second diagnostic ceiling.
The isolated repository gate also passed 258 files and 2,046 tests; inside that
run the same two cases completed in 1.77 seconds and 0.83 seconds. This points
to host resource latency, but the current test reports only the outer timeout,
so it cannot identify whether Git setup, `openWarp`, `indexHead`, or the MCP
call consumed the budget.

## Risk

A coarse timeout makes a healthy semantic invariant look like a product
failure and gives maintainers no evidence about the slow phase. Repeated local
reruns waste time, while globally raising the timeout would make real hangs
slower to detect.

## Desired Outcome

WARP-backed integration fixtures should expose bounded phase timing and use a
timeout policy derived from the work they intentionally perform. A failure
must distinguish repository setup, WARP open, indexing, and product-query
latency without weakening the full-suite hang detector.

## Acceptance Criteria

- The historical `code_show` and indexed `code_find` fixtures record or report
  elapsed time for Git setup, WARP open, each index operation, and the MCP
  query when their budget is exceeded.
- A slow phase is named in failure output instead of surfacing only Vitest's
  generic test timeout.
- The fixtures remain tiny and continue proving WARP routing rather than being
  replaced with mocks of the graph boundary.
- Host and isolated runs use an explicit, documented integration-test budget
  that tolerates normal startup variance while still failing a deliberate
  stalled-open, stalled-index, or stalled-query regression.
- No repository-wide timeout increase is used as the sole repair.
