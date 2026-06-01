---
title: "Generated SVG DAG diffs obscure backlog review"
feature: method
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 3
effort: S
status: open
reported: 2026-06-01
issue: https://github.com/flyingrobots/graft/issues/71
---

# Generated SVG DAG diffs obscure backlog review

## Problem

Small backlog changes can produce very large `dependency-dag.svg` diffs. Reviewers
need to inspect the source card and generated DOT truth, not hundreds of SVG
coordinate changes.

## Risk

Generated visual diffs drown out meaningful planning changes. Review attention
shifts from backlog semantics to unreadable SVG churn.

## Desired Outcome

Generated DAG artifacts stay fresh without dominating PR review.

## Acceptance Criteria

- GitHub treats `docs/method/backlog/dependency-dag.svg` as generated or
  otherwise collapses it by default.
- Review guidance points reviewers to source cards and `dependency-dag.dot`.
- CI still verifies that generated DAG artifacts are fresh.
