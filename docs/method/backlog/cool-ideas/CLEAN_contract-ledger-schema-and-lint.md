---
title: "Schema + linting for Technical Teardown Contract Ledger"
feature: surface
kind: cool-idea
legend: CLEAN
lane: cool-ideas
priority: 3
effort: M
status: open
reported: 2026-05-30
---

# Schema + linting for Technical Teardown Contract Ledger

## Idea

Define a structured schema for the `Contract Ledger (Golden Path)` table and add a
CI-backed validator that reads the markdown table and verifies:

- required columns (`Tool`, `Contract`, `Trigger`, `Expected Output`, `Evidence`)
- evidence link existence and line range reachability
- field values against a known allowlist of contracts per tool

## Why now

The teardown is now explicit and machine-checkable in spirit, but not yet machine-
enforced. This is an opportunity to add guardrails while the table format is
fresh and easy to standardize.

## Acceptance Criteria

- A validator script can parse the ledger table deterministically.
- CI runs the validator and fails if required columns or required rows are missing.
- Evidence links in the `Evidence` column are valid paths and contain at least one
  line-range anchor.
- Unknown contracts are flagged and require explicit addition to the schema.

## Open Questions

- Should the validator live in repo scripts (e.g., `scripts/teardown-contracts.ts`) or under existing `src/` tooling?
- Should it hard-fail on broken references, or report in a soft warning mode for initial rollout?
