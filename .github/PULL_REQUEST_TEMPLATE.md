# PR Template

## Summary

- What changed:
- Why this change matters:
- Related issue(s):
- Change kind(s): refactoring / new feature / bug fix / deliberate behavior change.
- Surface: runtime / tests or harness / build / policy or docs. State when runtime behavior is unchanged; explain mixed changes and changed expectations.

## Testing evidence

Apply [graft.testing/1.0.1](../TESTING_STANDARDS.md) and its
[adoption scope](../docs/testing/adoption.md) to new/materially changed tests.
Link a concise design/retro receipt; use N/A with a reason for inapplicable items.

- Claims, boundaries, oracle sources, and calibration receipts (intended red and restored green):
- Bug fix: observed red on the unfixed revision, or approved reproduction exception:
- Test owner/size, numeric resource ceilings, suite budget, actual isolation, and exploration/replay limits:
- Known counterexamples retained or necessarily covered by an identified replacement:
- First failures, quarantine/XFAIL/deletion decisions, and any scoped approved exceptions:
- Relevant coverage gaps and remaining blind spots:

## Method compliance check

- [ ] Required design packet exists in `docs/design/` (if implementation changed behavior or structure)
- [ ] Public-facing / backlog changes are reflected in METHOD artifacts
- [ ] Backlog card path(s):
- [ ] Validation commands, results, and justified omissions are recorded in the linked receipt.
  - Policy/docs only: `git diff --check` and `pnpm lint`; manual semantic review, no document-format tests.
  - Code: `pnpm lint`, `pnpm typecheck`, and relevant tests (`pnpm test` for the isolated suite).
  - Public/three-surface behavior: applicable `pnpm release:surface-gate` evidence.

## Debt and ideas

- New debt introduced? (yes / no)
- If yes, file in:
  - `docs/method/backlog/bad-code/...` and/or
  - `docs/method/backlog/cool-ideas/...`

## Deployment note

- [ ] No `main` push/rewrite needed for this PR workflow.
