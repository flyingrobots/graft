# v0.12.0 Release Verification Witness

## Discovery Facts

- Repository type: JS/TS package (pnpm); lockfile `pnpm-lock.yaml`
- Publishable unit: `@flyingrobots/graft` (npm)
- Version-bearing manifest: `package.json` (`0.11.1` -> `0.12.0`)
- Previous tag: `v0.11.1`
- Target tag: `v0.12.0`
- Release branch: `release/v0.12.0`
- Release baseline: `origin/main` at `87f1ab0e`
- Registry state before publication: `@flyingrobots/graft@0.11.1` is `latest`
- No local/remote v0.12.0 tag or GitHub Release existed before preparation.

## Validation

| Step | Command | Result |
| :--- | :--- | :--- |
| Baseline worktree | `git status --short` | clean before release cycle |
| Registry | `npm view @flyingrobots/graft version dist-tags time --json` | latest 0.11.1 |
| Tag discovery | `git ls-remote --tags origin 'v0.12.0*'` | no matching tag |
| Security RED | `pnpm security:check` on baseline | failed: critical 1, high 11 |
| Security GREEN | `pnpm security:check` after bounded override repair | passed: critical 0, high 0 |
| Lockfile | `pnpm install --frozen-lockfile` | pass; lockfile in sync |
| Release gate | `WESLEY_BIN=$HOME/.cargo/bin/wesley pnpm release:check` | pass |
| Diff whitespace | `git diff --check` | pass |

## Expected Gate Coverage

The release gate includes the agent-worktree guard, hermetic Wesley structural
schema check, lint, typecheck, release surface tests, Docker-isolated full test
suite, security check, and dry-run package build.

- Wesley 0.1.0 regenerated both structural-history artifacts byte-for-byte and
  verified the Echo package descriptor.
- The release surface gate passed 2 files / 10 tests.
- The Docker-isolated suite passed 258 files / 2,048 tests.
- The security gate reported `critical=0 high=0 moderate=1 low=2`.
- The package dry run built `flyingrobots-graft-0.12.0.tgz`.

## Dogfood

After the release PR merges and before tagging, run the merged `main` CLI
version smoke and daemon status command. After publication, install the npm
artifact under `~/.graft/installs/0.12.0`, verify its executable provenance,
then cut over the daemon and client configurations.

## Merge, Tag, Publish

Pending until the release PR passes review and merges to `main`.

## Non-Blocking Warnings

- The local npm configuration warns that `NPM_TOKEN` is unset. Publication uses
  the repository's GitHub Actions OIDC trusted-publishing job, not that local
  token.
