# Release Design: v0.7.0

## Included Work

- WARP snapshot indexing through `indexHead`
- Compact AST root anchors, attached AST snapshot blobs, and cross-file
  import/reference edges
- WARP-backed `graft_log`, `graft_churn`, `graft_blame`, and
  `graft_review` MCP execution paths
- Aggregate-backed `graft_churn` counts for live symbols, with
  tick-receipt preservation for removed symbols
- WARP-aware reference counting for structural review
- Slice-first mitigation for the highest-risk graph read paths
- Lazy-index guardrails: explicit-path indexing, per-file patches, and
  patch payload budgets
- Symbol timeline, dead-symbol detection, stale-doc checking, drift
  sentinel, and structural drift support tools
- Refactor difficulty scoring through `graft_difficulty` and
  `graft symbol difficulty`
- Opt-in parser-backed sludge detection on `doctor`
- Session/projection helpers that support agent handoff, replay,
  projection safety, and knowledge maps
- Daemon-backed stdio MCP runtime selection through
  `graft serve --runtime daemon` and generated `graft init`
  configuration
- Read-only daemon status inspection through `graft daemon status`
- Git-facing structural review aggregation through
  `git graft enhance --since <ref>` / `git-graft enhance`
- Narrow governed exact replacement through the `graft_edit` MCP tool
- Session-local advisory drift warnings for the `graft_edit`
  `jsdoc_typedef` first slice
- Dockerized copy-in test isolation for the default `pnpm test` path
- Repo path resolver hardening for symlink-parent create/write escape
  posture
- Agent worktree hygiene guard for preventing `.claude/worktrees/`
  artifacts from entering commits

## Hills Advanced

- **WARP**: structural history now reads from graph facts instead of
  shelling out to Git or grep for the primary MCP paths.
- **Structural metrics**: churn counts now come from WARP aggregate
  queries for live symbols, which unblocks the refactor-difficulty
  score work.
- **Structural risk**: agents can query a refactor difficulty score
  before choosing between direct refactor and safer workaround.
- **Daemon runtime**: MCP clients can explicitly choose repo-local stdio
  or daemon-backed stdio, and operators can inspect daemon health from
  the CLI.
- **Governed edit first slice**: agents get one policy-aware exact edit
  aperture without claiming full governed writes or causal write
  provenance.
- **Agent observability**: agents can inspect what they know, replay
  sessions, and reason over structural drift with more deterministic
  surfaces.
- **Diagnostics**: operators and agents can ask `doctor` for a
  parser-backed sludge scan before deciding whether a file needs
  refactoring.
- **Release truth**: the branch, package version, changelog, release
  notes, BEARING, and METHOD packet now describe the same release line.
- **Agent safety**: release preflight now catches staged parallel-agent
  worktree artifacts before they can become commit history.
- **Validation safety**: the default test path now runs in Docker
  copy-in isolation, keeping release validation away from live checkout
  Git hooks and ambient Git environment variables.

## Sponsored Users

- **Coding agents** get graph-backed structural history and reference
  data without broad source scans, plus a narrow governed exact-edit
  path for safe replacement work.
- **MCP users** can choose repo-local stdio or daemon-backed stdio
  explicitly instead of relying on hidden runtime assumptions.
- **Operators** get a clearer v0.7.0 release packet and fewer stale
  direction surfaces, plus a read-only daemon status command.
- **Contributors** get a cleaner backlog and release target before the
  remaining v0.7.0 stabilization work continues.

## Version Justification

**Minor** (`0.6.1` to `0.7.0`).

This release adds externally meaningful structural-history behavior,
daemon runtime selection, new CLI/MCP surfaces, a governed edit first
slice, WARP-backed support tools, and MCP result-shape changes. It is
too large for a patch. Because Graft is pre-1.0, the `graft_blame`
result shape change is permitted in a minor release, but it is still
called out as a breaking consumer-facing change.

## Migration

- No setup migration is required for standard CLI/MCP users.
- Consumers parsing `graft_blame` JSON should update to the new
  timeline-oriented WARP result shape.
- Internal callers should migrate from removed commit-walking indexer
  helpers to `indexHead`.
- Daemon-backed MCP is opt-in through `graft serve --runtime daemon` or
  generated MCP config from `graft init --mcp-runtime daemon`.
- `graft_edit` `driftWarnings` are advisory diagnostics only; they are
  not policy refusals and not causal write-provenance events.

## Explicitly Post-v0.7.0

The v0.7.0 backlog lane is now clear. These cards were preserved as
post-v0.7.0 follow-up scope, not release blockers:

- `WARP_lsp-enrichment`: bounded semantic enrichment first slice. This
  remains valid product direction, but it introduces a new semantic
  provider boundary and WARP fact class and is not required for the
  current release story.
- `CORE_migrate-to-slice-first-reads`: remaining medium-risk full-scan
  read sweep. The high-risk paths are already mitigated; the rest is
  externally blocked on git-warp observer geometry APIs.

Known METHOD tooling caveat: `method_status` can still report stale
active cycles that have repo-visible retros or completed design docs.
Release readiness should use the checked-in backlog lanes, generated
dependency DAG, retros, witnesses, and git state as the authoritative
repo truth until that METHOD reporting drift is repaired.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.7.0`
- `CHANGELOG.md` has a `0.7.0` section
- `docs/releases/v0.7.0.md` is final
- `docs/method/releases/v0.7.0/verification.md` is filled with actual
  preflight/tag/publish evidence
- `docs/method/backlog/v0.7.0/` has no active release-blocking cards
- `pnpm release:check` passes on the final release commit
