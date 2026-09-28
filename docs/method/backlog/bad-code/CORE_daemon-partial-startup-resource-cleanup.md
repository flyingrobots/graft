---
title: "Unwind daemon resources when startup fails"
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

# Unwind daemon resources when startup fails

## Problem and evidence

Source baseline: `b7938aa9dbf274942a584fe18b21e6e635f2a369`.
Evidence: `src/mcp/daemon-server.ts:50-91,93-97,119-136`.

Worker children are constructed before control-plane/monitor initialization, socket preparation and listener bind. The factory has no encompassing acquisition/unwind guard for failures in those later steps. A failed start can therefore leave acquired resources without the returned daemon close handle.

## Bounded next delivery

Introduce explicit startup resource ownership and reverse cleanup after each injected initialization failure. Assert child termination, listener removal only when owned, monitor stop and release of acquired handles. Keep the change separate from package movement and preserve active-socket refusal behavior; never delete another daemon socket.

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
