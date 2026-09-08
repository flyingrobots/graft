---
title: "Bound worker resource use and replacement loops"
feature: daemon-runtime
kind: bad-code
legend: CORE
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-09-07
owner: flyingrobots
review_by: 2026-09-14
---

# Bound worker resource use and replacement loops

## Problem and evidence

Source baseline: `b7938aa9dbf274942a584fe18b21e6e635f2a369`.
Evidence: `src/mcp/daemon-worker-child-pool.ts:18-20,132-141,206-219`.

The default pool eagerly creates up to four processes, provides no Graft-managed per-worker or aggregate memory budget/recycle policy, and replaces exited children without a restart-rate budget in this owner. Worker graph opens and native parser allocations are separate from the daemon parent pool. These are risks, not measured attribution of the missing large process.

## Bounded next delivery

Measure parent and children separately under a fixed workload; choose numeric admission and worker budgets with OS/runtime limits stated. Drain and retire idle workers, preserve uncertain mutation outcomes, and bound crash replacement with backoff. Test startup failure, worker crash, safe retirement and no automatic retry of an operation whose commit outcome is unknown.

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
