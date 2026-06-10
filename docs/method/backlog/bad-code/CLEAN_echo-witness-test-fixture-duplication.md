---
title: "Echo witness tests duplicate the import-batch fixture literal"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 4
effort: S
status: open
reported: 2026-06-10
---

# Echo witness tests duplicate the import-batch fixture literal

## Problem

The seven-field `RecordGitWarpImportBatchInput` fixture literal is repeated
in `test/unit/echo/intent-flow.test.ts`,
`test/unit/echo/obstruction-mapping.test.ts` (twice), and
`test/unit/echo/structural-history-codec.test.ts`, varying only in
`importBatchId` and `summary`.

## Risk

Schema evolution of the input type forces four coordinated edits; a missed
edit produces confusing codec failures rather than a single fixture-builder
update.

## Desired Outcome

A small shared builder (e.g., `test/unit/echo/helpers.ts` with
`importBatchInput(overrides)`) used by all witness tests.

## Acceptance Criteria

- One fixture builder; all four literals replaced.
- Slice 4 parity fixtures reuse the same builder.
