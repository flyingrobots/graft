---
title: "Echo descriptor to fake witness generator"
feature: core
kind: cool-idea
legend: CORE
lane: cool-ideas
priority: 2
effort: M
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/76
---

# Echo descriptor to fake witness generator

## Idea

Derive the fake Echo-shaped TypeScript witness from the checked-in
structural-history Echo package descriptor.

## Why

The next Graft slice should prove the TypeScript seam without depending on real
Echo runtime behavior. If the fake witness is hand-maintained, it can drift from
the descriptor that defines the package shape.

## Desired Outcome

The fake witness consumes descriptor facts such as operation names, evidence
labels, artifact identity, and package identity instead of duplicating them.

## Acceptance Criteria

- Fake witness tests fail if descriptor operation names and fake operation names
  diverge.
- The fake does not claim Echo durability or runtime witnesshood.
- No Echo repo changes are required.
- Missing real Echo capabilities become explicit planning items rather than
  hidden fake behavior.
