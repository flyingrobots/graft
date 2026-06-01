---
title: "ASAP queue health dashboard"
feature: surface
kind: cool-idea
legend: SURFACE
lane: cool-ideas
priority: 3
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/81
---

# ASAP queue health dashboard

## Idea

Expose a lightweight dashboard for the ASAP queue.

## Why

ASAP is the most visible execution lane. It should be easy to see whether it is
small, actionable, sequenced, and free of shipped work.

## Desired Output

- Card count.
- Priority distribution.
- Blocked versus unblocked cards.
- Cards blocked by shipped or missing cards.
- Cards without design packets.
- Cards older than a configurable threshold.

## Acceptance Criteria

- Dashboard output is deterministic and text-first.
- It can run locally without GitHub.
- It flags completed cards that still live in ASAP.
- It can be embedded in future SITREP output.
