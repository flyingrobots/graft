---
title: "Backlog SITREP command"
feature: surface
kind: cool-idea
legend: SURFACE
lane: cool-ideas
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/75
---

# Backlog SITREP command

## Idea

Add a command that prints a concise operational SITREP from the repo's planning
truth.

## Why

Humans and agents repeatedly ask "what is next?" The answer already lives across
`docs/BEARING.md`, active backlog lanes, DAG output, and recent retros. A command
would make that status deterministic.

## Possible Output

- Current BEARING.
- Active ASAP cards ordered by priority.
- Active up-next card.
- Bad-code count by priority.
- Cool-ideas count by legend.
- Unresolved internal dependency refs.
- Shipped-but-not-retired card warnings.

## Acceptance Criteria

- The command reads repo-local docs and backlog metadata.
- Output is deterministic and text-first.
- It highlights unresolved dependency refs.
- It does not require GitHub or network access.
