---
title: "Verify the landed resident LRU against real-process memory"
feature: daemon-runtime
kind: bad-code
legend: CORE
lane: bad-code
priority: 1
effort: M
status: open
reported: 2026-09-07
owner: flyingrobots
review_by: 2026-09-14
---

# Verify the landed resident LRU against real-process memory

## Problem and evidence

Historical baseline, before the fix landed: `b7938aa9dbf274942a584fe18b21e6e635f2a369`,
`src/mcp/warp-pool.ts:9-34`.

The successful-open map retains a promise and graph per repository/writer with no release, eviction, entry bound, or byte budget. Removal only occurs on opening failure. The installed 0.12.0 class exhibits the same behavior; 128 tiny fake repository opens retained 128 entries and reused the first handle. This establishes retention semantics, not the cause or size of the reported 7 GB incident.

## What has landed

[PR #251](https://github.com/flyingrobots/graft/pull/251) merged on
2026-09-11 as `c08d427e` and shipped in 0.14.0 (`CHANGELOG.md`, "Bounded WARP
resident LRU" and "Resident lifecycle accounting"). The pool now holds at most
four `(repoId, writerId)` handles by default (`DEFAULT_MAX_WARP_RESIDENTS` in
`src/mcp/warp-pool.ts`), hands out releasable leases, evicts the least recently
used idle entry, supports eager release with an idle limit of zero, and
releases the reservation of a failed open. Do not implement these again.
[PR #249](https://github.com/flyingrobots/graft/pull/249) keeps that bound but
keys each resident by `(repoId, worktreeId, writerId)`, so linked worktrees of
one repository occupy separate slots.

## What remains

- **A byte budget.** The landed bound counts handles; it does not bound total
  daemon or worker memory or the size of one graph. That gap is tracked by
  [`WARP_resident-count-is-not-a-memory-budget.md`](./WARP_resident-count-is-not-a-memory-budget.md),
  not here.
- **Real-process verification.** Measure the landed pool in a real daemon
  process: repeated acquire and release, concurrent use, failed opens and host
  teardown, with process memory recorded, so the incident below can be judged
  against evidence.

## Incident boundary

The reported more-than-7-GB process was absent at inspection time. No running
heap profile, pre-exit PID identity, or process-family allocation history was
captured. This card must not close that incident as diagnosed or fixed without
additional evidence. The review date requires triage and prioritization, not
silent acceptance of the risk.
