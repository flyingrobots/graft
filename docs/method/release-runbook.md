# Release Runbook

Use this runbook when a release has already been shaped in
`docs/method/releases/vX.Y.Z/release.md` and is ready for pre-flight.

This is intentionally the execution layer, not the doctrine layer. The
release doctrine lives in `docs/method/release.md`.

## Abort conditions

- Never guess. Never claim success for anything you did not directly
  verify.
- Never fabricate evidence. Record the exact command, exit code, and
  relevant output on failure.
- Abort immediately if the working tree is dirty.
- Abort immediately if `main` is not exactly synced with `origin/main`.
- Abort immediately if required tools, credentials, signing
  configuration, CI visibility, or registry visibility are missing.
- Abort immediately if any required validation or publish verification
  step fails.

## Phase 0: Discovery

Before changing anything, determine and record:

- repository type: JS/TS monorepo (pnpm)
- package manager: pnpm, lockfile: pnpm-lock.yaml
- version-bearing manifests: package.json
- publishable units: `@flyingrobots/graft` (npm)
- semver-public module path(s) and documented public API surface
- latest reachable semver tag matching `v*`
- current branch
- exact sync state versus `origin/main`

If any discovery item cannot be determined confidently, abort.

## Phase 1: Guards

Run these in order:

1. Verify the working tree is clean.
2. Verify the current branch is `main`.
3. Fetch `origin/main` and tags.
4. Verify `HEAD` exactly matches `origin/main`.

Do not continue past the first failed guard.

## Phase 2: Versioning and release notes

1. Confirm the target version declared in
   `docs/method/releases/vX.Y.Z/release.md`.
2. Validate that the declared version matches the actual release scope,
   SemVer impact, repository policy, and any documented public API
   changes.
3. Verify that the target tag does not already exist locally or on the
   remote.
4. Update `package.json` version.
5. Refresh `pnpm-lock.yaml`.
6. Update `CHANGELOG.md` — move Unreleased to versioned section.
7. Write or refresh `docs/releases/vX.Y.Z.md`.
8. If documented public API changed, verify the release notes name the
   changed exports, classify the change as additive or breaking, and
   include migration guidance when needed.
9. If the capability registry, root package surface, or documented
   three-surface posture changed, refresh:
   - `docs/three-surface-capability-matrix.md`
   - `docs/public-api.md`
   and be prepared to pass the explicit three-surface posture gate in
   Phase 3.

## Phase 3: Validation

Run validation strictly in order:

1. `pnpm install` — ensure lockfile is current
2. `pnpm guard:agent-worktrees` — no `.claude/worktrees/` paths are
   tracked or staged
3. `pnpm lint` — zero errors, zero warnings
4. `pnpm release:surface-gate` — capability registry, public API
   contract, and three-surface matrix stay in sync
5. `pnpm test` — all tests pass in the Docker copy-in test container
6. `pnpm security:check` — fail on any high / critical audit finding
7. `pnpm pack:check` — packaging sanity check
8. `npm info @flyingrobots/graft` — verify registry reachable

Abort on the first hard failure. Do not claim success from queued or
in-progress CI state.

`pnpm test` is the canonical release validation path. It must not be
replaced by a host-side `vitest run` unless the release is explicitly
halted for test harness debugging. The Docker test image copies the
repository without `.git`, so validation cannot inherit the operator's
live checkout hooks or Git worktree environment.

`pnpm security:check` is the release-time dependency/security gate.
Current policy:

- `critical` or `high` findings block release
- `moderate` and below require triage but do not automatically block
  release

## Phase 3.5: Dogfood

Before tagging, sanity-check graft against itself:

1. Start a fresh graft MCP session against the repo.
2. Run `doctor` — verify parser healthy, thresholds correct.
3. Run `safe_read` on a small file (e.g. `src/parser/lang.ts`) —
   expect `projection: "content"`.
4. Run `safe_read` on a large file (e.g. `src/mcp/server.ts`) —
   expect `projection: "outline"` with jump table.
5. Run `file_outline` on a source file — verify entries and jump
   table look sane.
6. Run `stats` — verify receipt counters are tracking.

If any tool returns unexpected results, abort and investigate.
Record the dogfood results in the verification witness.

## Phase 4: Merge, tag, and CI publish

1. Open a PR from the release branch to `main`.
2. Wait for required PR checks to pass.
3. Merge the PR to `main` using the normal repository merge path.
4. Check out `main` locally and update it from `origin/main`.
5. Verify the working tree is clean.
6. Verify `HEAD` exactly matches `origin/main`.
7. Create the release tag on the `main` HEAD: `vX.Y.Z`.
8. Verify the tag points at the `main` release commit.
9. Push the exact release tag to origin.
10. Confirm `.github/workflows/release.yml` starts from the pushed tag.
11. Verify the release workflow sanity job passes. It checks tag/package
    version alignment, lockfile consistency, package metadata, lint,
    typecheck, Dockerized tests, security gate, and pack dry-run.
12. Verify the release workflow creates the GitHub Release and uploads
    the tarball assets.
13. Verify the release workflow publishes to npm through OIDC
    provenance.
14. Verify npm registry delivery directly: `npm info @flyingrobots/graft`.

Do not run `pnpm publish` manually during the normal release path. A
manual publish is a recovery action only after the CI release workflow
has failed or been intentionally bypassed, and it requires explicit
operator approval.

## Evidence

Record the release witness in
`docs/method/releases/vX.Y.Z/verification.md`. At minimum include:

- discovery facts
- commands run
- pass/fail results
- tag and commit SHAs
- GitHub Release URL
- npm registry URL
- any non-blocking warnings
