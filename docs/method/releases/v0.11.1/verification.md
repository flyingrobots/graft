# v0.11.1 Release Verification Witness

## Discovery Facts

- Repository type: JS/TS package (pnpm); lockfile `pnpm-lock.yaml`
- Publishable unit: `@flyingrobots/graft` (npm)
- Version-bearing manifest: `package.json` (`0.11.0` -> `0.11.1`)
- Previous tag: `v0.11.0`
- Target tag: `v0.11.1`
- Release branch: `docs/actions-release-inspection`
- Registry state before publication: `npm view @flyingrobots/graft version`
  returned `0.11.0`

## Validation

| Step | Command | Result |
| :--- | :--- | :--- |
| Worktree guard | `git status --short` | clean before release-prep edits |
| Tag discovery | `git tag --list 'v0.11.*'` | only `v0.11.0` existed locally |
| Remote tag discovery | `git ls-remote --tags origin 'v0.11.*'` | only `v0.11.0` existed remotely |
| Registry | `npm view @flyingrobots/graft version dist-tags time --json` | latest `0.11.0` before publication |
| Lockfile | `pnpm install` | pass; lockfile already up to date |
| Release gate | `WESLEY_BIN=$HOME/.cargo/bin/wesley pnpm release:check` | pass |
| Diff whitespace | `git diff --check` | pass |

Notes:

- The passing release gate included `guard:agent-worktrees`,
  `schema:structural-history:check`, `lint`, `typecheck`,
  `release:surface-gate`, Dockerized `pnpm test`, `security:check`, and
  `pack:check`.
- Dockerized `pnpm test` passed 244 test files / 1835 tests.
- `security:check` reported `critical=0 high=0 moderate=1 low=1 info=0` and
  passed under the repository release policy.
- `pack:check` completed a dry-run package build for
  `flyingrobots-graft-0.11.1.tgz`.
- `pnpm install` emitted the existing ignored-build-scripts warning for
  `cbor-extract`, `esbuild`, and `roaring`; no lockfile update was needed.

## Dogfood

This release changes process documentation and release metadata only. The
release runbook's pre-tag MCP dogfood remains required after this PR merges to
`main` and before pushing `v0.11.1`.

## Merge, Tag, Publish

Pending until the release PR is merged to `main`.

## Non-Blocking Warnings

- No warnings recorded yet.
