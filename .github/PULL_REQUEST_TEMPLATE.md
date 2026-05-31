# PR Template

## Summary

- What changed:
- Why this change matters:
- Related issue(s):

## Method compliance check

- [ ] Required design packet exists in `docs/design/` (if implementation changed behavior or structure)
- [ ] Public-facing / backlog changes are reflected in METHOD artifacts
- [ ] Backlog card path(s):
- [ ] Review posture tests run:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm release:surface-gate` (if public/three-surface behavior changed)

## Debt and ideas

- New debt introduced? (yes / no)
- If yes, file in:
  - `docs/method/backlog/bad-code/...` and/or
  - `docs/method/backlog/cool-ideas/...`

## Deployment note

- [ ] No `main` push/rewrite needed for this PR workflow.
