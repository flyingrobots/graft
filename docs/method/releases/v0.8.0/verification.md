# Release Witness: v0.8.0

This witness records release-branch preflight and release-blocker
follow-up validation. Tagging and publish verification are still pending
until the release-blocker branch is merged to `main` and the `v0.8.0`
tag is pushed from the merged main commit.

## Discovery

- Repository type: JS/TS package (pnpm)
- Previous package version: `0.7.1`
- Planned version: `0.8.0`
- Branch: `release/v0.8.0`
- Merged main baseline: `3394d6e Merge pull request #49 from flyingrobots/release/v0.8.0`
- Release blocker branch: `release/v0.8.0-blockers`
- Release blocker branch synced with origin: yes, `origin/release/v0.8.0-blockers`
- `main` release guard: pending; final release runbook requires main to
  be exactly synced with `origin/main` before tag/publish

## Validation

| Step | Result |
|------|--------|
| `pnpm lint` | pass as part of `pnpm release:check`, 2026-05-06 11:58 PDT |
| `pnpm typecheck` | pass as part of `pnpm release:check`, 2026-05-06 11:58 PDT |
| `pnpm release:surface-gate` | pass, 2 files / 10 tests, 2026-05-06 11:58 PDT |
| `pnpm test` | pass, Docker isolated, 216 files / 1592 tests, 2026-05-06 11:58 PDT |
| `pnpm security:check` | pass, critical=0 high=0 moderate=0 low=0 info=0, 2026-05-06 11:58 PDT |
| `pnpm pack:check` | pass, dry-run tarball `flyingrobots-graft-0.8.0.tgz`, 2026-05-06 11:58 PDT |
| `pnpm release:check` | pass, 2026-05-06 11:58 PDT |
| `git diff --check` | pass, 2026-05-06 12:00 PDT |

## Release Gate Stabilization

Merged-`main` validation on 2026-05-12 reproduced full-suite timeout
nondeterminism before tagging:

| Step | Result |
|------|--------|
| `pnpm release:check` on `main` at `3394d6e` | fail in Docker-isolated `pnpm test`: 15 failed files / 20 timed-out tests, 2026-05-12 |
| Focused rerun of the failed files | pass, 15 files / 153 tests, 2026-05-12 |
| `pnpm test -- --maxWorkers 2` | pass, Docker isolated, 216 files / 1592 tests, 2026-05-12 |

The release blocker was suite-wide resource pressure from unbounded
Vitest worker concurrency in the Docker-isolated release runner, not a
deterministic assertion failure in the affected product paths.

The release-blocker branch now applies bounded Docker-isolated Vitest
worker concurrency by default while preserving explicit `--maxWorkers`
overrides for diagnosis.

| Step | Result |
|------|--------|
| `pnpm test:local --run test/unit/scripts/isolated-test-args.test.ts test/unit/release/docker-test-isolation.test.ts tests/playback/CORE_test-runner-docker-daemon-hard-failure.test.ts` | pass, 3 files / 19 tests, 2026-05-12 20:20 PDT |
| `pnpm release:check` | pass, includes Docker-isolated test suite at 216 files / 1594 tests plus security and pack checks, 2026-05-12 20:23 PDT |

## Security Disposition

Initial release prep found one moderate advisory:
`GHSA-v2v4-37r5-5v8g` / `CVE-2026-42338` for transitive
`ip-address@10.1.0` through
`@git-stunts/git-warp > roaring > node-gyp > make-fetch-happen >
@npmcli/agent > socks-proxy-agent > socks > ip-address`.

The release branch pins `ip-address` to `10.2.0` through
`pnpm.overrides`. The final `pnpm security:check` reports zero
advisories.

## Package Delivery Checks

| Check | Result |
|-------|--------|
| package version is `0.8.0` | pass |
| tarball includes `bin/` and `dist/` | pass |
| tarball excludes `src/` | pass |
| `bin/graft.js` starts the built CLI | pass, package-shape gate |
| runtime dependencies exclude `tsx` | pass, package-shape gate |
| release note and changelog agree on user-facing scope | pass |

## Tag and Publish

- Release branch prep commit: `04c435b release: prepare v0.8.0`
- Final release commit: pending merged `main` release commit
- Tag: pending
- Tag push: pending
- Release workflow: pending
- GitHub Release created by workflow: pending
- npm publish by workflow: pending
- Direct npm registry verification: pending
