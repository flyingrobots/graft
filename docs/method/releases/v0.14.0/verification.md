# v0.14.0 verification witness

## Discovery

- Baseline: clean `main` and `origin/main` at `c08d427e`.
- Baseline CI: run `34571456941` completed successfully.
- Previous tag and registry latest: `v0.13.0` / `0.13.0`.
- Publishable unit: `@flyingrobots/graft`, using pnpm 10.30.0.
- Release branch: `release/v0.14.0` in a separate worktree.
- Version-bearing files: `package.json` and the generated structural-history
  package descriptor's `sourcePackageVersion` field.
- No local or remote `v0.14.0` tag existed at discovery.
- Installed daemon at discovery: `0.12.0`, PID 56911, 16 sessions, one bound,
  zero active or queued jobs, four idle workers, two resident repositories.
  These are a historical sample, not a restart-time admission check.

## Local validation

All commands ran in the release worktree before the preparation commit.

| Command | Result |
| :--- | :--- |
| `pnpm install` | Pass; lockfile unchanged |
| `WESLEY_BIN=/Users/james/.cargo/bin/wesley pnpm release:check` | Pass, exit 0 |
| `node bin/graft.js --version` | `graft 0.14.0` |
| `npm info @flyingrobots/graft version --json` | `0.13.0`, registry reachable |
| `git diff --check` | Pass |

The sequential release check passed worktree hygiene, Wesley 0.1.0 schema and
package-descriptor checks, lint, typecheck, 10 public-contract tests, the full
Docker suite of 2,370 tests in 266 files, security policy, and package build.
The version bump does not change the lockfile dependency graph. Root exports,
capability registry, public API docs, and the three-entry-point matrix are
unchanged from v0.13.0. Logs: `/tmp/graft-v0140-release-check.log` and
`/tmp/graft-v0140-install.log`.

## MCP dogfood

A fresh built stdio server ran in an owned temporary Git repository containing
copies of `src/parser/lang.ts` and `src/mcp/server.ts` from this release tree.
The MCP client verified parser health and the 150-line threshold, content for
`lang.ts`, a nonempty outline/jump table for `server.ts`, 14 explicit outline
entries for `lang.ts`, and session counters of one read and one outline.
The client closed afterward. No live repository or daemon was used.

Executable: `/tmp/graft-v0140-dogfood.mjs`; outputs:
`/tmp/graft-v0140-dogfood.log` and `/tmp/graft-v0140-dogfood-results.json`.

## Non-blocking findings

The audit reports `critical=0 high=0 moderate=8 low=0`. Eight package entries
represent seven unique advisories: development paths through ESLint and Vitest,
and runtime paths through the MCP SDK to `qs` and `hono`. No exploitability or
unreachability claim is made. The existing release policy permits triaged
moderate findings. The owned follow-up is
[moderate dependency advisories](../../backlog/bad-code/CLEAN_moderate-dependency-advisories.md).

Local pnpm reports an unset `NPM_TOKEN` placeholder. Publication uses Actions
OIDC; no local publish is attempted. Node 26 emits a tooling deprecation, and
pnpm skips dependency build scripts under the existing policy. These did not
prevent the build, parser smoke, or isolated tests from passing.

## Merge, tag, publication, and deployment

Pending. Record actual PR, commit, tag, run, registry, and process evidence as
these steps complete. Local preflight is not evidence of publication.
