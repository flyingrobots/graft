# Local daemon transport and session lifecycle

Implement the local-only transport and lifecycle layer for a future
shared Graft daemon.

Why this matters:
- the daemon needs an explicit runtime path separate from repo-local
  `graft serve`
- local-user authentication should come from the host transport and
  process boundary rather than from client-declared ids
- session open/close, health, and liveness need a real contract before
  control-plane or multi-repo coordination work can sit on top

Desired end state:
- explicit daemon startup path separate from repo-local stdio
- local-only transport such as Unix domain sockets or named pipes
- no default TCP listener
- same-user authentication posture enforced by transport permissions
- daemon session lifecycle with start, close, liveness, and failure
  behavior documented and implemented
- daemon session startup does not implicitly create separate WARP
  instances for sessions that later bind into the same canonical repo
- clean compatibility story that leaves current repo-local `serve`
  clients unchanged

Related:
- `docs/design/0051-system-wide-mcp-daemon-and-workspace-binding/system-wide-mcp-daemon-and-workspace-binding.md`
- `docs/method/backlog/up-next/SURFACE_workspace-bind-and-routing-surface.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`

Effort: L
