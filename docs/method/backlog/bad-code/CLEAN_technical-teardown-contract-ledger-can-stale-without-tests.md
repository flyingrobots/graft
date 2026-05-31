---
title: "Technical Teardown contract ledger can drift from implementation"
feature: surface
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-05-30
---

# Technical Teardown contract ledger can drift without tests

## Problem

The `docs/TECHNICAL_TEARDOWN.md` `Contract Ledger (Golden Path)` section now
contains a machine-checkable list of `safe_read` and `code_show` contracts,
along with evidence links. Without a validation check, those evidence links and
contract descriptions can drift as source code changes.

## Risk

Agent onboarding can trust stale or wrong contract claims and fail when the system
behavior diverges from the documented contract. This makes onboarding brittle and
reduces confidence in the teardown as a source of truth.

## Evidence

- [`docs/TECHNICAL_TEARDOWN.md` ledger section](../../../TECHNICAL_TEARDOWN.md#contract-ledger-golden-path)
- [`src/operations/safe-read.ts`](../../../../src/operations/safe-read.ts)
- [`src/mcp/tools/safe-read.ts`](../../../../src/mcp/tools/safe-read.ts)
- [`src/mcp/tools/code-show.ts`](../../../../src/mcp/tools/code-show.ts)

## Desired Outcome

- Add a lightweight check (or doc test) that verifies each claimed contract row maps to
  real behavior and expected response shape.
- Fail CI if a linked evidence path points to deleted or changed content.
- Consider a JSON schema for the contract rows and validate it during CI.

## Acceptance Criteria

- The check catches stale evidence links in CI.
- A behavior change in one contract path requires updating the relevant ledger row.
- The check includes at least all rows currently in the `Contract Ledger`.
