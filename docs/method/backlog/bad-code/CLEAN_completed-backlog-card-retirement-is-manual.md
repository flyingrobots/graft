---
title: "Completed backlog card retirement is manual"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/68
---

# Completed backlog card retirement is manual

## Problem

When a cycle closes as `hill-met`, the source backlog card can remain in an
active lane unless a human or agent remembers to retire it. PR #66 exposed this:
the structural-history Echo descriptor card stayed in `asap/` after the slice
had shipped.

## Risk

Active backlog lanes can advertise already-shipped work as pullable. This
corrupts SITREPs, dependency DAGs, and contributor orientation.

## Desired Outcome

Cycle closure either retires shipped cards automatically or fails if the matching
active card is still present.

## Acceptance Criteria

- A check finds retros marked `hill-met` whose matching card still lives in an
  active backlog lane.
- Shipped cards are moved to `docs/method/graveyard/` or another explicit
  terminal lane.
- Active cards that depend on a shipped card are updated to reference shipped
  prerequisite context rather than `blocked_by`.
