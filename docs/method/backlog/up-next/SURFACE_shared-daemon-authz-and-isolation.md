# Define auth, authorization, and isolation for a shared daemon

The 2026-04-07 ship-readiness audit found that the future shared-daemon
direction still lacks an explicit operational model for authentication,
authorization, and resource isolation across concurrent clients and
repos.

Why this matters:
- a local repo-scoped stdio server can rely on implicit trust in ways a
  system-wide daemon cannot
- once multiple agents and repos share one long-lived service, routing
  alone is not enough
- the product needs an explicit answer for who can access which
  workspaces, caches, logs, and execution surfaces

Desired end state:
- define the trust model for a shared daemon
- specify authentication and authorization expectations for clients
- define isolation boundaries for:
  - repo identity
  - worktree identity
  - session state
  - logs and receipts
  - escape-hatch tools like `run_capture`
- connect the result back to the daemon/workspace-binding design

Related:
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: L
