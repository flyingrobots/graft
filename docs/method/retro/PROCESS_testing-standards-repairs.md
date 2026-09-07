# Testing Standards review repairs

- Date: 2026-09-07
- Branch: `cycle/testing-standards`
- Reviewed baseline: `02faaf22b6902d2e0e1af43521733ba54061ce94`
- Change kind: normative policy corrections and document presentation repairs;
  runtime behavior unchanged
- Authorization: operator request to resolve all discovered issues following
  [R1–R5](https://github.com/flyingrobots/graft/pull/255#issuecomment-5575909666)
- Status: repairs in progress; no merge or current-head review completion claimed

## Scope and validation boundary

The [repair plan](../../design/PROCESS_testing-standards-adoption.md#authorized-review-repair-plan)
preceded implementation. Each issue receives a focused commit. Policy semantics
are checked against concrete examples; runtime RED/GREEN tests and Markdown
assertion suites would not supply the relevant evidence here and are not added.
Use lint, whitespace checks, and the consuming GitHub rendering/delivery surface
where applicable. The initial adoption retro remains a historical receipt.

## R1 — affected tests, not an entire suite

The reviewed design's final “does” repeated “pull the entire suite into scope.”
The corrected design, policy scope, and adoption record now identify changed
tests/claims and actual shared-fixture/harness effects. Amendment 1.0.1 records
the correction; contributor pointers identify the effective version.

Manual semantic playback:

| Change | In scope | Outside the retrofit boundary |
| --- | --- | --- |
| Correct one test's oracle | That test and its affected claims | Unrelated unchanged tests in the same suite |
| Change a shared fixture's observed state | Tests whose behavior/evidence depends on that changed state | Tests unaffected by that state, including unrelated consumers |
| Mechanically move a test without changing its semantics/evidence | No new scope solely because of the move | Other suite members |

The three authoritative scope statements were read against these examples;
none uses suite membership alone to expand adoption. Whitespace and lint
validation accompany the commit. No legacy tests were changed.

## Remaining review repairs

R2 (binding behavior), R3 (intended oracles), R5 (metadata), and R4 (published
links) remain to be implemented in that dependency order. R5 precedes R4 so the
immutable linked documents include the corrected metadata presentation.
