---
title: "PR merge gate SITREP command"
feature: surface
kind: cool-idea
legend: SURFACE
lane: cool-ideas
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/78
---

# PR merge gate SITREP command

## Idea

Add a command that summarizes PR merge readiness from CI, review threads, review
decisions, CodeRabbit status, and known self-audit comments.

## Why

The Code Lawyer loop repeatedly reconstructs the same merge gate evidence with
GraphQL and `gh pr checks`. A command would reduce mistakes and make the gate
auditable.

## Possible Shape

```bash
pnpm pr:gate 66
```

## Acceptance Criteria

- Reports CI checks by name and conclusion.
- Lists unresolved review threads separately from informational comments.
- Classifies CodeRabbit cooldown, skipped review, no-actionable-comments, and
  actionable findings.
- Prints `MERGE GATE: OPEN` or `MERGE GATE: LOCKED` with reasons.
