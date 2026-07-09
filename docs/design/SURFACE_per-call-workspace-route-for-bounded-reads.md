---
title: "Per-call workspace route for repo tools"
legend: "SURFACE"
cycle: "SURFACE_per-call-workspace-route-for-bounded-reads"
source_backlog: "docs/method/backlog/bad-code/SURFACE_session-global-workspace-activation-races.md"
status: completed
retro: "docs/method/retro/SURFACE_per-call-workspace-route-for-bounded-reads/SURFACE_per-call-workspace-route-for-bounded-reads.md"
---

# Per-call workspace route for repo tools

Source backlog item:
`docs/method/backlog/bad-code/SURFACE_session-global-workspace-activation-races.md`

Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

An agent can pass an explicit `cwd` to repo-scoped read, structural,
search, and diff tools and get path resolution, policy checks, receipts,
cache, metrics, and attribution for that workspace without mutating the
MCP session's active workspace.

The model is:

- active workspace remains available for legacy repo-scoped calls
- explicit `cwd` is a per-call route, not a hidden rebind
- daemon authorization still gates routed calls
- routed execution captures an immutable workspace context before the
  handler runs

## Playback Questions

### Human

- [x] If another agent activates repo B, can my tool call against repo A
  still resolve against repo A by passing `cwd`?
- [x] Can I use a daemon-authorized workspace without making it the
  session-global active workspace?
- [x] Does `workspace_status` remain honest about the active workspace
  after a routed read?

### Agent

- [x] Does `safe_read` accept `cwd` and route through a non-mutating
  execution context?
- [x] Does a structural/search tool such as `code_find` accept `cwd`
  and route through the same non-mutating execution context?
- [x] Do policy checks use the routed workspace path resolver before the
  tool handler reads the file?
- [x] Does read attribution use the routed workspace context even when
  the daemon session is otherwise unbound?
- [x] Does the regression cover the old failure mode where activation
  of repo B caused a relative read for repo A to resolve in repo B?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the active workspace is
  still a single status field, while routed reads carry their own
  explicit `cwd`.
- Non-visual or alternate-reading expectations: routed behavior is
  visible in structured receipts and returned absolute paths; operators
  do not need to infer routing from logs.

## Localization and Directionality

- Locale / wording / formatting assumptions: no locale-sensitive
  behavior is in scope.
- Logical direction / layout assumptions: none beyond canonical
  absolute paths and stable JSON field names.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: whether a tool
  call used an explicit `cwd`, which resolved worktree backed the call,
  and whether the active workspace changed.
- What must be attributable, evidenced, or governed: daemon
  authorization, path-boundary enforcement, routed read attribution, and
  the fact that client-provided `cwd` is a path hint resolved
  server-side rather than an authority token.

## Non-goals

- [ ] Do not remove active workspace binding in this slice.
- [ ] Do not make client-supplied repo or worktree ids authoritative.
- [ ] Do not auto-authorize daemon workspaces from a routed read.
- [ ] Do not add per-call routing to mutating tools or daemon
  control-plane tools in this slice.
- [ ] Do not expose another session's receipts, cache contents, or raw
  runtime logs.

## Current Repo Truth

`docs/design/SURFACE_opened-workspace-paths.md` intentionally kept one
active workspace per MCP session and avoided per-tool routing envelopes.
Dogfooding found the missing concurrency case: several agents can share
one daemon-backed MCP session and all call `workspace_open` with
`activate: true`, so session-global activation becomes a race-prone
routing variable.

The daemon session host correctly creates one `GraftServer` and one
`WorkspaceRouter` per MCP transport session, but that does not protect
multiple agents multiplexed through the same MCP session.

## Repair Shape

Add a per-call route for daemon-scheduled repo tools:

```json
{
  "cwd": "/path/to/repo-or-subdir",
  "path": "src/file.ts"
}
```

Rules:

- `cwd` is optional; omitted behavior remains the legacy active
  workspace behavior.
- When present, the invocation engine resolves `cwd` through
  `resolveWorkspaceRequest`.
- In daemon mode, the resolved workspace must already be authorized.
- The routed workspace gets a `WorkspaceExecutionContext` before policy
  wrappers or handlers run.
- The active workspace and `workspace_status` are not mutated by the
  routed call.

## Test Strategy

- [x] Unit regression: a single daemon session authorizes repo A without
  binding, then `safe_read` with `cwd: repoA` succeeds while
  `workspace_status` remains unbound.
- [x] Unit regression: a single daemon session activates repo A, then repo B,
  then `safe_read` with `cwd: repoA` returns repo A content while a
  legacy `safe_read` still resolves against active repo B.
- [x] Unit regression: a single daemon session activates repo A, then repo B,
  then `code_find` with `cwd: repoA` finds repo A symbols while a
  legacy `code_find` still resolves against active repo B.
- [x] Existing path-boundary and policy tests continue proving that absolute
  paths cannot escape the routed workspace.

## Validation Evidence

- `npx vitest run test/unit/mcp/per-call-workspace-route.test.ts`
- `npx vitest run test/unit/mcp/per-call-workspace-route.test.ts test/unit/mcp/opened-workspaces.test.ts test/unit/mcp/workspace-binding.test.ts test/unit/mcp/path-boundary-runtime.test.ts test/unit/mcp/daemon-multi-session.test.ts test/unit/contracts/output-schemas.test.ts test/unit/contracts/capabilities.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `git diff --check`
