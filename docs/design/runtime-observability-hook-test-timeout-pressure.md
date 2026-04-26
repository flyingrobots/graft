---
title: runtime observability hook test exceeds unit-test timing budget under full suite load
feature: runtime-observability
kind: trunk
legend: BAD_CODE
effort: S
source_lane: bad-code
cycle: bad-code-lane-tranche-2026-04-26
status: completed
retro: "docs/method/retro/bad-code-lane-tranche-2026-04-26/retro.md"
requirements:
  - "Runtime observability checkout-boundary hook test"
acceptance_criteria:
  - "Hooked checkout-boundary continuity test completes within the normal unit-test timeout under full-suite load"
  - "The test either uses narrower fixtures or is moved/classified as an integration test with an explicit timing budget"
  - "Assertions continue to prove hook-observed checkout-boundary continuity evidence"
---

# runtime observability hook test exceeds unit-test timing budget under full suite load

## Relevance

Relevant. The hook-observed checkout-boundary test protects important runtime
observability behavior.

## Original Card

`test/unit/mcp/runtime-observability.test.ts` has a checkout-boundary test that
passes in isolation but exceeded the default `5s` timeout, then a `15s`
timeout, during `pnpm test` on `release/v0.7.0`.

The assertions are still valuable, so the test now carries an explicit
integration-style timeout. The underlying timing pressure remains debt.

Tests that are fast in isolation but much slower under full-suite load create
noisy failures and make unrelated work look broken. This test touches git hooks
and checkout-boundary local-history evidence, so it is especially worth
keeping, but it should not behave like an unbounded unit test.

## Design

Keep the hook-observed continuity assertions and validate that the existing
explicit timeout holds under full-suite load.

## Tests

`pnpm test` validates the test under full-suite load.
