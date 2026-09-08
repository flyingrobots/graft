---
title: "Bound session observation retention and lifecycle"
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

# Bound session observation retention and lifecycle

## Problem and evidence

Source baseline: `b7938aa9dbf274942a584fe18b21e6e635f2a369`.
Evidence: `src/operations/observation-cache.ts:91-165; src/mcp/daemon-session-host.ts:138-160`.

Session observation maps retain per-file outlines and jump tables without entry or byte admission limits. The session host removes records on transport close/error and shutdown but has no host-level maximum-session or idle-expiry policy in this module. This does not establish which sessions survived a particular client disconnect.

Related delivery: [PR #250](https://github.com/flyingrobots/graft/pull/250), open at `924c59c41905a06ea966ae41f875e8874589c0f7`, addresses session inactivity and scratch cleanup and reports a review hold. Reconcile that existing lifecycle work; this card also tracks observation byte budgets that session expiry alone does not establish.

## Bounded next delivery

Define per-slice and host budgets, explicit application close, maximum admitted sessions, and an idle/disconnect policy compatible with in-flight jobs. Distinguish opened membership from routed-cache residency. Eviction must make unavailable observation history explicit rather than changing unknown to unchanged. Use controlled clocks and lifecycle schedules; preserve attribution when an origin ends.

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
