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

## Recurrence: PR #245, 2026-08-16

The same skip happened on a design packet, which is the highest-cost place for
it. CodeRabbit posted a review-skipped notice naming all three changed files as
ignored by path filters, and produced no findings at all.

`METHOD.md` makes the packet the artifact implementation is built from — it
names the hill, the acceptance criteria, and the test strategy before any code
exists. So the document that determines what a cycle builds is the one document
the review gate does not read, and CI cannot compensate: it passes on
documentation by construction.

Codex was the only reviewer. It found **16 defects across three rounds, 11 of
them P1**, including a settlement contract that could not encode the field its
own symlink policy turns on, and a deny-by-default replay comparison whose
keep-list omitted `partial`, `error`, and the refusal-only fields — so it would
have rejected every result variant carrying them. (It accepted an ordinary
success, which kept `path`, `outline`, `jumpTable`, and `reason`; the narrower
claim is the accurate one and is the one worth recording.) Five of the sixteen
findings were introduced by the previous round's repair.

This raises the card's cost evidence but not its remedy — the acceptance
criteria below already name `docs/design/**/*.md` and already require generated
artifacts to stay excluded.

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
