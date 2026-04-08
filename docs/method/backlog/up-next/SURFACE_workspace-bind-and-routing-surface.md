# Workspace bind and routing surface for the local shared daemon

Now that the daemon trust model and workspace-binding contract are
explicit, implement the daemon-only bind/routing surface itself.

Why this matters:
- repo-scoped tools need one active workspace binding per daemon session
- authorization should happen when the daemon resolves and binds a
  workspace, not when arbitrary tool args mention paths
- caches, budgets, receipts, and saved state need a lawful boundary when
  a session rebinds

Desired end state:
- daemon-only `workspace_bind`, `workspace_status`, and
  `workspace_rebind` surfaces
- server-side resolution of `cwd` / worktree hints into canonical repo
  and worktree identity
- binds that resolve to the same canonical repo attach to one
  repo-scoped WARP history by default instead of creating implicit
  per-session or per-worktree WARP instances
- repo-scoped tools denied while the session is unbound
- rebind semantics that start a fresh session-local workspace slice by
  default instead of silently carrying cache/budget/state across
  worktrees
- capability profile attachment at bind time, including default-denied
  `run_capture`

Related:
- `docs/design/0051-system-wide-mcp-daemon-and-workspace-binding/system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_local-daemon-transport-and-session-lifecycle.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: L
