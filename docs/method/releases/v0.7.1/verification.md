# Release Witness: v0.7.1

This witness records release-branch preflight. Tagging and publish
verification are still pending until the release branch is merged to
`main` and the `v0.7.1` tag is pushed from the merged main commit.

## Discovery

- Repository type: JS/TS package (pnpm)
- Previous package version: `0.7.0`
- Planned version: `0.7.1`
- Branch: `release/v0.7.1`
- Release branch synced with origin: pending
- `main` release guard: pending; final release runbook requires main
  to be exactly synced with `origin/main` before tag/publish

## Validation

| Step | Result |
|------|--------|
| focused package-shape tests | pass, 2026-04-30 09:46 PDT |
| `pnpm install --lockfile-only` | pass, 2026-04-30 09:36 PDT |
| `pnpm lint` | pass, 2026-04-30 09:46 PDT |
| `pnpm typecheck` | pass, 2026-04-30 09:46 PDT |
| `pnpm release:surface-gate` | pass, 2026-04-30 09:46 PDT |
| `pnpm test` | pass, 195 files / 1468 tests, 2026-04-30 09:48 PDT |
| `pnpm security:check` | pass, critical=0 high=0 moderate=1 low=0 info=0, 2026-04-30 09:49 PDT |
| `pnpm pack:check` | pass, 2026-04-30 09:49 PDT |
| `pnpm release:check` | pass, 2026-04-30 09:49 PDT |
| `docker build --target runtime -t graft-runtime:test .` | pass, 2026-04-30 09:50 PDT |
| `docker run --rm --entrypoint node graft-runtime:test /app/bin/graft.js --help` | pass, 2026-04-30 09:50 PDT |

## Package Delivery Checks

| Check | Result |
|-------|--------|
| tarball excludes `src/` | pass |
| tarball includes `bin/` and `dist/` | pass |
| `bin/graft.js` has a Node shebang | pass |
| `bin/graft.js` imports built `dist/cli/entrypoint.js` | pass |
| runtime dependencies exclude `tsx` | pass |

## Tag and Publish

- Release commit: pending
- Tag: pending
- Tag push: pending
- Release workflow: pending
- GitHub Release created by workflow: pending
- npm publish by workflow: pending
- Direct npm registry verification: pending
