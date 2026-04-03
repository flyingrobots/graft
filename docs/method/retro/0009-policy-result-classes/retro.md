# Retrospective — Cycle 0009: PolicyResult Class Hierarchy

**Type:** Debt (CLEAN_CODE)
**Outcome:** Hill met.

## What changed

`PolicyResult` went from a TypeScript interface (vanishes at
runtime) to three frozen classes: `ContentResult`, `OutlineResult`,
`RefusedResult`. Callers use `instanceof` instead of switching on
`projection` strings.

## Impact

- Zero `projection === "string"` comparisons in policy/operations
- JSON wire format unchanged (classes serialize identically)
- All 227 tests pass without behavior changes
- OCP improved: adding a new projection type means adding a new
  class, not editing every switch

## Drift check

None. Clean refactor — no behavior changes.

## What went well

- `exactOptionalPropertyTypes` caught several constructor issues
  at compile time
- The frozen-class pattern works seamlessly with JSON.stringify
- Tests that used `.projection` string checks migrated cleanly to
  `toBeInstanceOf`

## What to improve

- `evaluatePolicy` is still a god function — should decompose into
  BanChecker, ThresholdChecker, SessionCapChecker (Phase 2)
- Operation-level results (SafeReadResult) are still plain
  interfaces — next CLEAN_CODE cycle
