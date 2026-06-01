---
title: "Backlog card lifecycle linter"
feature: surface
kind: cool-idea
legend: SURFACE
lane: cool-ideas
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/84
---

# Backlog card lifecycle linter

## Idea

Add a linter for backlog card lifecycle consistency.

## Why

The repo now depends on backlog metadata for execution. Missing `status`,
stale `blocked_by`, shipped cards in active lanes, and broken design links are
structural errors, not stylistic nits.

## Acceptance Criteria

- Active cards must have lane-compatible status.
- Active cards may not be blocked by missing or graveyard-only cards.
- Shipped cards must not live in active lanes.
- Design packet links are checked for active ASAP cards.
- The linter can run in CI without network access.
