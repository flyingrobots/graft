---
title: "CodeRabbit path filters skip Method docs PRs"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/69
---

# CodeRabbit path filters skip Method docs PRs

## Problem

CodeRabbit skipped PR #66 because every changed file was filtered out, including
Method retro, backlog, DOT, and SVG files. In this repository, those docs are
not ornamental; they are planning and process truth.

## Risk

Docs-only PRs can mutate the active backlog, BEARING, design packets, or retro
evidence without automated review coverage. The most important issue in PR #66
was a docs/process truth issue that CodeRabbit did not review.

## Desired Outcome

CodeRabbit reviews important Method and planning docs while continuing to avoid
generated noise where appropriate.

## Acceptance Criteria

- `.coderabbit.yaml` includes review coverage for high-value docs paths such as
  `docs/BEARING.md`, `METHOD.md`, `CODE_STANDARDS.md`,
  `docs/design/**/*.md`, and `docs/method/backlog/**/*.md`.
- Generated artifacts such as `dependency-dag.svg` remain excluded or clearly
  marked as generated.
- A docs-only backlog PR receives a real CodeRabbit review instead of a complete
  path-filter skip.
