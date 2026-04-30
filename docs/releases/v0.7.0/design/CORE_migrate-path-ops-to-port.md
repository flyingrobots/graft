---
title: "PathOps runtime boundary hardening first slice"
legend: "CORE"
cycle: "CORE_migrate-path-ops-to-port"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/CORE_migrate-path-ops-to-port.md"
classification: "too-broad-narrowed"
scope_check_date: "2026-04-26"
acceptance_criteria:
  - "Runtime repo path resolvers share one confinement behavior"
  - "Absolute paths outside the active repo root are rejected or refused across repo-local API, repo-local MCP, daemon-bound MCP, and daemon worker contexts"
  - "Symlink escapes remain blocked where filesystem targets exist"
  - "PathOps usage has an explicit allowlist for adapter/boundary/test-only node:path imports"
  - "No broad node:path style refactor is attempted in this slice"
---

# PathOps runtime boundary hardening first slice

Source backlog item: `docs/method/backlog/v0.7.0/CORE_migrate-path-ops-to-port.md`
Legend: CORE

## Hill

Scope-check verdict: the original card is too broad for one v0.7.0
cycle. The first implementation slice should harden runtime repo path
boundaries before any governed edit/write work proceeds.

The hill is met when repo-local API, repo-local MCP, daemon-bound MCP,
and daemon worker contexts all use one shared repo path confinement
behavior for user-supplied paths. Absolute paths outside the active repo
root must not be readable just because they are absolute. Existing
symlink escape protections must remain intact. The slice must not attempt
to migrate every `node:path` import in the repository.

## Playback Questions

### Human

- [ ] Can I point to one explicit repo path confinement behavior used by
      repo-local API, repo-local MCP, daemon-bound MCP, and daemon worker
      contexts?
- [ ] In temp repos only, does `safe_read` refuse or fail clearly for an
      absolute path outside the repo root on every runtime surface?
- [ ] Does the scope document explain which `node:path` imports remain
      allowed adapter/boundary/test usage?

### Agent

- [ ] Does `createRepoPathResolver` reject absolute paths outside the
      repo root instead of returning them as-is?
- [ ] Do `createPathResolver` and `createRepoPathResolver` share the
      same logical and symlink escape expectations?
- [ ] Do regression tests cover repo-local server, repo-local API,
      daemon-bound session, and daemon worker/offloaded read contexts
      using temp repos?
- [ ] Does a static allowlist prevent future high-risk direct path usage
      without demanding zero `node:path` imports everywhere?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: path refusal output should
  be explicit and stable enough for operators and agents to understand
  that a path escaped the active repo root.
- Non-visual or alternate-reading expectations: machine-readable MCP/API
  responses should preserve the refusal/failure reason without requiring
  terminal text scraping.

## Localization and Directionality

- Locale / wording / formatting assumptions: paths are opaque
  filesystem identifiers; diagnostic wording is English operator text.
- Logical direction / layout assumptions: no visual layout assumptions.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: the allowlist must
  identify which direct `node:path` imports are permitted and why.
- What must be attributable, evidenced, or governed: every runtime
  path-boundary decision should be traceable to a resolver/port, not to
  ad hoc path math hidden in a tool handler.

## Non-goals

- [ ] No governed edit/write work.
- [ ] No WARP/LSP expansion.
- [ ] No daemon feature work.
- [ ] No broad style-only refactor.
- [ ] No attempt to reach zero direct `node:path` imports outside
      adapters in this slice.
- [ ] No live-checkout playback as subject data.
- [ ] No test playback outside temp repos or static inspection.

## Scope-check verdict

Classification: **too broad; rewrite into a runtime-boundary first
slice**.

The original acceptance criteria said:

- zero direct `node:path` imports outside `src/adapters/`
- all path operations route through `PathOps`

Current reality is more nuanced. Direct path operations exist in adapter
and composition-root code where Node filesystem semantics are the point
of the boundary. Tests also use `node:path` heavily to build temp repos,
fixtures, and static source paths. A zero-import migration would be a
large style refactor that obscures the real release risk.

The real risk is not the import count. The real risk is inconsistent
runtime path confinement.

## Key finding

There are two repo path resolver families with different confinement
semantics:

- `src/mcp/context.ts:createPathResolver` confines both absolute and
  relative user paths to `projectRoot`, and uses `realpathSync` to catch
  symlink escapes when the target exists.
- `src/adapters/repo-paths.ts:createRepoPathResolver` rejects relative
  `..` traversal, but returns absolute paths as-is.

The weaker resolver is used by runtime surfaces:

- `src/api/repo-workspace.ts`
- `src/mcp/workspace-router-runtime.ts`
- `src/mcp/repo-tool-worker-context.ts`

This was verified during the scope check:

```text
createRepoPathResolver(/etc/passwd) -> /etc/passwd
createPathResolver(/etc/passwd) -> Path traversal blocked: /etc/passwd
```

That mismatch is release-blocking before governed edit/write work.

## Contamination map

| Area | Files | Classification | Notes |
|---|---|---|---|
| Runtime repo path confinement | `src/mcp/context.ts`, `src/adapters/repo-paths.ts`, `src/api/repo-workspace.ts`, `src/mcp/workspace-router-runtime.ts`, `src/mcp/repo-tool-worker-context.ts` | must migrate/harden now | Highest-risk mismatch. User paths can flow through different resolvers depending on surface. First slice should unify behavior. |
| Precision/path query normalization | `src/mcp/tools/precision-paths.ts`, `src/mcp/tools/code-refs.ts`, `src/mcp/tools/map.ts`, `src/mcp/tools/map-collector.ts` | must audit in first slice; migrate only if needed | These normalize user path filters for Git/ref queries. They should not be broad-refactored until resolver semantics are unified and tested. |
| Hook read path boundary | `src/hooks/shared.ts`, `src/hooks/read-governor.ts` | allowed boundary usage with tests | `safeRelativePath` is path-sensitive and already tested. Keep in allowlist unless shared confinement helpers make migration trivial. |
| CLI cwd/socket normalization | `src/cli/command-parser.ts`, `src/cli/daemon-status-model.ts`, `src/cli/peer-command.ts`, `src/cli/init*.ts`, `src/cli/migrate-local-history.ts`, `src/cli/json-document.ts` | allowed boundary usage for now; follow-up candidate | These are CLI composition/file-writing boundaries. Do not churn them in the first runtime resolver slice except for `--cwd` if tests expose mismatch. |
| Daemon root/socket/file layout | `src/mcp/daemon-bootstrap.ts`, `src/mcp/daemon-server.ts`, `src/mcp/daemon-session-host.ts`, `src/mcp/control-plane/authz-storage.ts`, `src/mcp/persistent-monitor-runtime.ts`, `src/mcp/runtime-observability.ts`, `src/mcp/monitor-persistence.ts`, `src/mcp/persisted-local-history.ts`, `src/mcp/tools/run-capture.ts`, `src/mcp/tools/state.ts` | allowed daemon/filesystem boundary usage | These construct daemon-owned paths, socket paths, state paths, and log paths. Treat as adapter/composition boundary, not user path policy, unless a specific bug is found. |
| Git hook bootstrap | `src/git/target-git-hook-bootstrap.ts`, `src/cli/init-target-hooks.ts` | needs separate follow-up | Hook directory resolution mixes Git config, worktree roots, and generated hook text. Keep separate from repo read confinement. |
| Node adapters | `src/adapters/node-paths.ts`, `src/adapters/repo-paths.ts`, `src/adapters/rotating-ndjson-log.ts` | allowed adapter usage | `repo-paths.ts` is allowed to import `node:path`, but its semantics must be hardened. |
| Tests/playback/helpers | `test/**`, `tests/**` | test-only acceptable usage | Tests create temp repos, sockets, fixtures, and static source paths. Do not migrate as product code. |

## Direct import count snapshot

Scope check found direct `node:path` imports in production directories:

- `src/mcp`: 23 files
- `src/cli`: 9 files
- `src/adapters`: 3 files
- `src/api`: 2 files
- `src/hooks`: 2 files
- `src/git`: 1 file

Tests are intentionally path-heavy:

- `test`: 82 matching files
- `tests`: 30 matching files

This confirms that the original “zero direct imports” criterion is not a
safe first slice.

## Proposed first implementation slice

Narrow the card to:

**PathOps runtime boundary hardening first slice**

Implementation target:

- Make `createRepoPathResolver` and `createPathResolver` share one
  confinement implementation or one clearly delegated helper.
- Preserve logical `..` traversal rejection.
- Preserve symlink escape rejection when targets exist.
- Reject absolute paths outside the repo root across:
  - repo-local API `RepoWorkspace`
  - repo-local MCP server context
  - daemon-bound workspace context
  - daemon repo-tool worker/offloaded context
- Keep `toRepoPolicyPath` behavior aligned with the same boundary.
- Add a static allowlist test for direct `node:path` imports in
  production code so future work does not confuse allowed
  composition-root use with runtime user path policy.

First-slice acceptance criteria:

- `createRepoPathResolver("/repo")("/etc/passwd")` throws
  `Path traversal blocked`.
- `createRepoPathResolver` and `createPathResolver` have equivalent
  tests for:
  - simple relative path inside root
  - absolute path inside root
  - relative traversal outside root
  - absolute path outside root
  - symlink directory escape
  - symlink file escape
  - non-existent in-root path
- Temp-repo tests prove outside absolute paths cannot be read through
  repo-local MCP, repo-local API, daemon-bound MCP, or daemon worker
  execution.
- Static inspection allows `node:path` only in named adapter,
  composition-root, daemon filesystem layout, CLI file-writing, Git hook
  bootstrap, and test/helper files.
- No broad migration of benign `path.join`/`path.dirname` usage.

## Explicit allowlist for `node:path`

Allowed in this first slice:

- Node adapters and path adapters:
  - `src/adapters/node-paths.ts`
  - `src/adapters/repo-paths.ts`
  - `src/adapters/rotating-ndjson-log.ts`
- Runtime composition roots and daemon filesystem layout:
  - daemon bootstrap/server/session/control-plane persistence files
  - runtime observability/log path files
  - persisted local history storage files
- CLI config/file-writing boundaries:
  - init config writers
  - JSON document writer
  - CLI parser for `--cwd` and `--socket` normalization
- Git hook bootstrap boundaries:
  - target hook directory resolution and generated hook paths
- Tests, playback tests, and helpers.

Not allowed after the first slice:

- ad hoc user-supplied repo path confinement outside the shared resolver
- new tool handlers that call `path.resolve` / `path.relative` directly
  on user `path` arguments
- daemon worker contexts using weaker path confinement than repo-local
  MCP

## Follow-up candidates

- CLI path normalization cleanup after runtime resolver hardening.
- Daemon socket/root path adapter if the daemon layout code keeps
  growing.
- Git hook bootstrap path adapter if target hook handling expands.
- Larger `PathOps` interface expansion only after the runtime
  confinement fix is stable.

## Original backlog context

Source: audit during churn-path-filter-exact-only cycle (2026-04-19)

The `PathOps` port (`src/ports/paths.ts`) and its node adapter
(`src/adapters/node-paths.ts`) now exist and are used by `structural-churn`
and `structural-log`. However, ~130+ path operations across 39+ files
still use `node:path` directly in non-adapter code.

The following original scope is intentionally **not** the first
implementation slice. It is preserved as historical context for the
broader migration, but the active v0.7.0 slice is the runtime boundary
hardening described above.

## Original broad scope

Migrate all `path.resolve`, `path.join`, `path.relative`, `path.normalize`,
`path.isAbsolute`, `path.dirname`, `path.basename`, `path.extname` calls
outside of `src/adapters/` to use the `PathOps` port.

## Original priority areas

1. **MCP layer** (~25+ instances) — workspace router, context, runtime overlay
2. **CLI layer** (~20+ instances) — init, command parsing, client config
3. **Hooks layer** (~2 instances) — path traversal validation
4. **Git layer** (~5 instances) — hook bootstrap

## Original approach

- Thread `PathOps` through options where needed
- Expand `PathOps` interface as needed (e.g., `dirname`, `basename`, `relative`)
- One sub-cycle per layer to keep PRs reviewable

Effort: L (multi-cycle)
