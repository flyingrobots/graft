---
title: "Receipt cumulative bytesAvoided stays zero despite outline projections"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-06-10
---

# Receipt cumulative bytesAvoided stays zero despite outline projections

## Problem

In a live MCP session, `safe_read` outline projections report per-call
`estimatedBytesAvoided` (observed: 17,974 bytes for a 26.7KB design doc
projected to outline), but `_receipt.cumulative.bytesAvoided` remains `0`
across the whole session — including after multiple outline projections.

## Risk

`bytesAvoided` is a headline value-proof metric: it is how a session receipt
demonstrates the governor saved context. If the cumulative aggregate never
incorporates outline savings, `stats` under-reports Graft's core benefit and
any dashboard or scorecard built on receipts inherits the error.

## Desired Outcome

Cumulative `bytesAvoided` aggregates the per-call estimated savings from every
projection (outline, refusal, cache hit) in the session.

## Acceptance Criteria

- After an outline projection with `estimatedBytesAvoided > 0`, the next
  receipt's `cumulative.bytesAvoided` reflects it.
- `stats` totals agree with the sum of per-call estimates.
- A unit test covers aggregation across mixed content/outline/refusal calls.
