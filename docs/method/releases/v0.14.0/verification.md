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

The [complete runnable command](witness/dogfood.md) and [bounded result](witness/dogfood-result.json)
are committed. Replay the command from the repository root at the v0.14.0
release commit, with Node, pnpm, and Git installed.

Each MCP request has a 30-second deadline. The runner creates a temporary
repository, prints the result location, and preserves full output there for
local diagnosis. The committed result omits the machine-specific temp path.
The script is a release smoke witness, not exhaustive parser coverage.

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

- Preparation PR: [#258](https://github.com/flyingrobots/graft/pull/258).
- Final reviewed head: `2f5da73c323974e013521d22b1d2fe9e556dd496`.
- Final local `release:check`: exit 0, including 2,371 Docker tests in 266
  files, ten public-contract tests, schema checks, lint, typecheck, security
  policy, and package build. The extra test is the MCP status-version
  regression described below.
- [PR CI run 34586438646](https://github.com/flyingrobots/graft/actions/runs/34586438646)
  passed the Node 20 and Node 22 jobs on that head.
- [Codex's final review](https://github.com/flyingrobots/graft/pull/258#issuecomment-5632744087)
  reported no major issues on that head. Both actionable review threads were
  resolved; the final paginated review audit found no unresolved threads or
  changes-requested reviews. CodeRabbit was rate-limited; the completed Codex
  review satisfied the documented fallback gate.
- Merged at `2026-09-11T09:58:07Z` as
  `8d02bcf84463ac853f8346d2c7e563ecef9a3589`. The merge tree exactly matched
  the reviewed head.
- Signed annotated tag `v0.14.0` points to that merged `main` commit.
  `git verify-tag v0.14.0` reported a good signature from James Ross, key
  `01A63D8E9DBEEDE32918AF9C39560E0406CA9135`. The tag was pushed normally.

[Release run 34586892333](https://github.com/flyingrobots/graft/actions/runs/34586892333)
ran on the tagged merge commit. Publication and local process replacement
are recorded separately below.

| Job | Job ID | Outcome |
| :--- | :--- | :--- |
| Sanity | `103223071497` | Success |
| GitHub release and assets | `103224258057` | Success |
| npm publish with OIDC provenance | `103224396465` | Success |

### Publication

The [GitHub Release](https://github.com/flyingrobots/graft/releases/tag/v0.14.0)
was published at `2026-09-11T10:03:27Z`. Its tarball and `SHA256SUMS` were
downloaded, and `shasum -a 256 -c SHA256SUMS` passed. Tarball SHA-256:

```text
0322579bb8e9d3e26840eabdeec2fcb7a3c795f1424c3514e49eacefcbb1ef02
```

The publish log recorded npm accepting `@flyingrobots/graft@0.14.0` at
`2026-09-11T10:07:43Z` and warned that registry processing could take a few
minutes. Initial registry queries returned E404 after the workflow succeeded.
That intermediate state was not treated as installable delivery. Provenance
was recorded in the [Sigstore transparency log](https://search.sigstore.dev/?logIndex=2792386780).

The registry subsequently reported version `0.14.0`, `latest: 0.14.0`, and
publication time `2026-09-11T10:14:53.421Z`. The registry response identifies
1,269 files and 5,049,150 unpacked bytes. The npm tarball is
[`graft-0.14.0.tgz`](https://registry.npmjs.org/@flyingrobots/graft/-/graft-0.14.0.tgz).
Its SHA-512 integrity is:

```text
sha512-qrCCsyn+ySnCyaU3jxV0YIAc2z1jIp6MiHXhEwkC//gsDaL34MGyLNIt9n7COmPpDZGR45lvFS2uRZpGgAqK9w==
```

The successful Actions publish job and the registry observation establish
delivery separately from the GitHub Release asset upload. No manual publish,
tag replacement, or release rerun was used during propagation.

### Installed artifact and portability check

Installed the exact registry version into `~/.graft/installs/0.14.0`, preserving
`~/.graft/installs/0.12.0` for rollback. The initial normal npm install failed:
`roaring@2.7.0` has no downloaded binary for Node 26's Darwin ARM64 ABI, and
its fallback compilation failed against V8. The launcher still pointed to
0.12.0 during this failure.

Retried with the repository's existing no-dependency-build-scripts policy:

```sh
npm install --prefix "$HOME/.graft/installs/0.14.0" \
  --omit=dev --save-exact --ignore-scripts @flyingrobots/graft@0.14.0
```

That install succeeded. The package-lock entry's version and integrity match
the registry response. All 1,268 non-manifest files match the checked GitHub
tarball byte for byte. The only manifest differences are npm retaining
`packageManager`, `pnpm`, and the `prepack` / `prepublishOnly` scripts that
pnpm's GitHub tarball omits. After accounting for those fields, the manifests
are equal. The [artifact result](witness/installed-artifact.json) retains these
checks without claiming that the two tarball byte streams are identical.

The installed executable reports `graft 0.14.0`. An isolated installed-package
smoke check passed parser health, content and outline projections, a bitmap
serialization round trip of `[1, 3, 42]`, and the default four-resident setting.
WARP reported its WASM bitmap backend (`nativeRoaring: false`). The complete
[installed smoke command and result](witness/installed-smoke.md) are retained.
No live workspace was opened for these checks. The unresolved installer
problem is recorded in
[Node 26 native installation](../../backlog/bad-code/CLEAN_node26-native-roaring-install.md).

### Local daemon replacement

Immediately before cutover, the old process reported zero active/queued jobs
and zero busy/queued worker tasks. Those counters are a scheduler/worker
sample, not proof that every ordinary RPC had drained.

The launcher was atomically replaced to point to `../installs/0.14.0/bin/graft`.
PID 56911 then exited after SIGTERM, without a forced kill. The new detached
process, PID 97570, launched from the immutable version-directory executable
using Node 26.0.0 and the existing same-user Unix socket. Its process command
was verified after startup and again in a subsequent sample.

| Observation | Before cutover | After startup |
| :--- | :--- | :--- |
| Daemon start | `2026-09-08T01:34:29.840Z` | `2026-09-11T10:19:33.758Z` |
| Health response `ok` | `true` | `true` |
| Sessions | 16 | 0 |
| Authorized workspaces / repositories | 68 / 30 | 68 / 30 |
| Active / queued jobs | 0 / 0 | 0 / 0 |
| Busy / queued worker tasks | 0 / 0 | 0 / 0 |
| Resident repositories | 5 | 0 |
| Resident handles | Not exposed by 0.12.0 | 0 |

The [bounded deployment record](witness/deployment.json) preserves the actual
cutover and verification times and counts. The new daemon inherited no
`GRAFT_WARP_MAX_RESIDENTS` override and uses the verified default of four.
Session transport continuity is not retained across replacement; existing
clients may need to reconnect. Authorization counts agree in these samples;
that is not a claim about historical session membership or current indexing.

Historical job and worker counters reset with the new process. They are not
summed across layers or compared as one accumulation epoch. Zero resident
handles immediately after restart is a startup observation, not sustained
memory evidence. This release does not establish a byte/RSS ceiling or explain
the earlier 7 GB incident.

## Review repair: strict status schema identity

The review correctly found the changed strict MCP status shape still advertised
`1.0.0`. The claimed `graft.cli.daemon_status` schema does not exist in
`CLI_COMMAND_NAMES` or `CLI_OUTPUT_SCHEMAS`; the text CLI uses its own model.
The first attempted two-case reproducer reached the MCP mismatch but the CLI
case failed at an unsupported lookup. That CLI failure is not product evidence.

The narrowed public JSON Schema test was RED on `2cf5146a`: expected version
constant `2.0.0`, received `1.0.0`. It now selects v2 for MCP `daemon_status`
only. The test owns one contract claim, uses the release contract as its literal
oracle, and has a one-second per-case budget with no test-body I/O. Existing
output-contract integration checks cover complete tool responses. The first
failure is retained in [schema-version-red.txt](witness/schema-version-red.txt).

The corrected output-contract file passes 16/16; build and typecheck pass.
The retained dogfood command passes with the same observations. Its initial
standalone `.mjs` placement failed typed lint project discovery, so the witness
retains the full runnable shell command without changing lint configuration.
