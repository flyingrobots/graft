---
title: "Echo capability gap ledger"
feature: core
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 2
effort: S
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/77
---

# Echo capability gap ledger

## Idea

Maintain a small ledger of Graft-discovered Echo capability needs, with evidence
from Graft-side integration slices.

## Why

Echo should remain generic and dumb unless Graft proves a real missing substrate
capability. A ledger keeps that boundary honest.

## Desired Outcome

Graft records concrete Echo requirements only when local fake or descriptor
work proves the need.

## Acceptance Criteria

- Each gap has evidence from a Graft test, design packet, or failed integration
  attempt.
- Each gap states whether Echo lacks a generic substrate capability or Graft
  merely needs an adapter.
- Closed gaps link to the Echo PR, Graft workaround, or decision not to pursue.
