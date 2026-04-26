# Release Design: v0.7.0

## Included Work

- WARP snapshot indexing through `indexHead`
- Full AST emission and cross-file import/reference edges
- WARP-backed `graft_log`, `graft_churn`, `graft_blame`, and
  `graft_review` MCP execution paths
- Aggregate-backed `graft_churn` counts for live symbols, with
  tick-receipt preservation for removed symbols
- WARP-aware reference counting for structural review
- Slice-first mitigation for the highest-risk graph read paths
- Symbol timeline, dead-symbol detection, stale-doc checking, drift
  sentinel, and structural drift support tools
- Opt-in parser-backed sludge detection on `doctor`
- Session/projection helpers that support agent handoff, replay,
  projection safety, and knowledge maps
- Agent worktree hygiene guard for preventing `.claude/worktrees/`
  artifacts from entering commits

## Hills Advanced

- **WARP**: structural history now reads from graph facts instead of
  shelling out to Git or grep for the primary MCP paths.
- **Structural metrics**: churn counts now come from WARP aggregate
  queries for live symbols, which unblocks the refactor-difficulty
  score work.
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

## Sponsored Users

- **Coding agents** get graph-backed structural history and reference
  data without broad source scans.
- **Operators** get a clearer v0.7.0 release packet and fewer stale
  direction surfaces.
- **Contributors** get a cleaner backlog and release target before the
  remaining v0.7.0 stabilization work continues.

## Version Justification

**Minor** (`0.6.1` to `0.7.0`).

This release adds externally meaningful structural-history behavior,
new WARP-backed support tools, and MCP result-shape changes. It is too
large for a patch. Because Graft is pre-1.0, the `graft_blame` result
shape change is permitted in a minor release, but it is still called
out as a breaking consumer-facing change.

## Migration

- No setup migration is required for standard CLI/MCP users.
- Consumers parsing `graft_blame` JSON should update to the new
  timeline-oriented WARP result shape.
- Internal callers should migrate from removed commit-walking indexer
  helpers to `indexHead`.

## Release Acceptance

This release is ready to tag when all of the following are true:

- `package.json` is bumped to `0.7.0`
- `CHANGELOG.md` has a `0.7.0` section
- `docs/releases/v0.7.0.md` is final
- `docs/method/releases/v0.7.0/verification.md` is filled with actual
  preflight/tag/publish evidence
- `pnpm release:check` passes on the final release commit
