---
title: "Enforce declared test resource classes and budgets"
feature: testing
kind: bad-code
legend: TEST
lane: bad-code
priority: 3
effort: M
status: open
reported: 2026-09-07
owner: flyingrobots
review_by: 2026-10-07
---

# Enforce declared test resource classes and budgets

## Problem and evidence

At `e1d34c18`, `scripts/isolated-test-runner.ts` disables test-container
networking and `scripts/isolated-test-args.ts` defaults to two Vitest workers.
Those controls do not enforce the complete per-test class/resource and suite
latency obligations in `graft.testing/1.0.0`. No new enforcement is installed
by the policy adoption.

## Bounded next delivery

Design an inherited target metadata scheme and enforce the smallest useful
set of declared time/resource ceilings. Report actual enforcement, numeric
budgets, environment and p95/total suite cost without requiring mass relabeling
of legacy tests. Calibrate failures using real resource violations; do not
test Markdown formatting. Explain harness overhead and OS control limitations.

## Until implemented

Follow [the adoption record](../../../testing/adoption.md): limits, ownership,
actual controls, manual review and scoped exceptions remain binding. This card
is not an exception or a prerequisite for the daemon inspector. The review date
requires triage, not completion of an unspecified infrastructure program.
