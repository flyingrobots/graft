---
title: "Bound daemon graph residency and release idle handles"
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

# Bound daemon graph residency and release idle handles

## Problem and evidence

Source baseline: `b7938aa9dbf274942a584fe18b21e6e635f2a369`.
Evidence: `src/mcp/warp-pool.ts:9-34`.

The successful-open map retains a promise and graph per repository/writer with no release, eviction, entry bound, or byte budget. Removal only occurs on opening failure. The installed 0.12.0 class exhibits the same behavior; 128 tiny fake repository opens retained 128 entries and reused the first handle. This establishes retention semantics, not the cause or size of the reported 7 GB incident.

Existing delivery: [PR #251](https://github.com/flyingrobots/graft/pull/251), open at `ede389ae04ffc96371e92b3b58493ba88299b3b9`, already implements owned binding/invocation leases and eager final-release eviction. This card tracks the main/installed gap and residual numeric budgets; reconcile and finish that review rather than create another lease implementation. No merge readiness was established in this investigation.

## Bounded next delivery

Design explicit leases and a bounded residency owner. Active work must keep its handle; releasing the final lease permits idle eviction. Preserve durable graph facts and writer identity. Verify repeated acquire/release, concurrent use, failed opens, host teardown, and real-process memory behavior separately. Inspection must not acquire or renew a lease.

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
