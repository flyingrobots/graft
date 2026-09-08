---
title: "Bound daemon work admission before retaining payloads"
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

# Bound daemon work admission before retaining payloads

## Problem and evidence

Source baseline: `b7938aa9dbf274942a584fe18b21e6e635f2a369`.
Evidence: `src/mcp/daemon-job-scheduler.ts:109-146; src/mcp/daemon-worker-child-pool.ts:53-107`.

The scheduler limits running concurrency while its per-lane arrays retain queued jobs. The worker pool also retains queued task objects. Neither shown admission path enforces queued count and encoded-byte budgets. Execution concurrency is not an allocation ceiling.

## Bounded next delivery

Add count and byte admission to the authoritative scheduler before payloads/closures are retained; define the bounded worker handoff queue and backpressure. Preserve per-repository fairness and immutable operation routes. Test threshold boundaries, large UTF-8 inputs, cancellation, failure, and reservation release with controlled projections and calibrated overload assertions.

Pull a focused design/acceptance packet before RED/GREEN work. The
[modular-runtime design](../../../design/CORE_modular-graft-runtime-and-library.md)
records the ownership model and independent runtime containment slices.
Monorepo restructuring and TUI delivery are not prerequisites.

## Incident boundary

The reported more-than-7-GB process was absent at inspection time. No running
heap profile, pre-exit PID identity, or process-family allocation history was
captured. This card must not close that incident as diagnosed or fixed without
additional evidence. The review date requires triage and prioritization, not
silent acceptance of the risk.
