---
title: "Generated artifact review boundary"
feature: method
kind: cool-idea
legend: CLEAN
lane: cool-ideas
priority: 3
effort: S
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/83
---

# Generated artifact review boundary

## Idea

Document and enforce which generated artifacts reviewers should inspect and which
ones are freshness evidence only.

## Why

Generated artifacts such as DAG SVGs and Wesley TypeScript output are important,
but they are not all equally reviewable. Clear boundaries improve review signal.

## Desired Outcome

Every generated artifact has a review posture:

- source of truth;
- generated but human-reviewable;
- generated freshness artifact only;
- ignored review noise.

## Acceptance Criteria

- Add a generated-artifact review table to contributor or Method docs.
- Mark at least DAG SVG and Wesley-generated TypeScript.
- CI or docs explain how freshness is verified.
