---
title: "Method retro recovery mode"
feature: method
kind: cool-idea
legend: METHOD
lane: cool-ideas
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/79
---

# Method retro recovery mode

## Idea

Add a recovery workflow for when `method_close` fails or times out.

## Why

The descriptor slice retro had to be written manually after `method_close`
timed out. A recovery mode would preserve audit integrity even when closure
automation fails.

## Desired Behavior

- Detect whether partial retro artifacts exist.
- Generate a minimal recovery template from cycle slug, drift output, PR URL,
  merge commit, and validation evidence.
- Mark the retro as manually recovered.
- Avoid overwriting existing artifacts unless explicitly requested.

## Acceptance Criteria

- Recovery mode can be run after a no-output timeout.
- Recovery mode can be run after a partial-write failure and reports what exists.
- Generated recovery packets include an automation-failure section.
