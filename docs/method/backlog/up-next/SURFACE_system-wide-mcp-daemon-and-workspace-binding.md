# System-wide MCP daemon and workspace binding

Design a single long-lived Graft service that can be used system-wide
by multiple agents at the same time, without assuming one fixed cwd or
one repo root per process.

Core problem:
- the current stdio server captures one `projectRoot`, one session,
  one cache, and one repo-state tracker at process start
- that is fine for repo-local dogfooding, but it is not the right
  contract for a shared system service

Questions:
- what transport should a system-wide shared service use instead of
  repo-scoped stdio?
- should clients bind workspace context at session start, per call, or
  both?
- what is the minimum binding payload:
  - cwd
  - worktree root
  - git common dir
  - explicit repo id
- what state should be keyed by:
  - git common dir for canonical repo/WARP identity
  - worktree root for live overlay, policy, and checkout state
  - client session for budget, cache, receipts, and saved state
- how should the service behave when a client cwd is outside a git repo?
- how should worktrees of the same repo share WARP state without
  collapsing their live state?
- what compatibility path keeps repo-local stdio useful while a daemon
  surface is introduced?

Deliverables:
- explicit daemon/session/workspace routing model
- proposed MCP/CLI context-binding surface
- statement of which current assumptions are repo-scoped debug behavior
  versus future product contract
- follow-on backlog split for transport, daemon lifecycle, and routing
  implementation

Related:
- `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-control-plane-for-persistent-monitors.md`

Why separate cycle:
- this is the architectural bridge between today's single-root stdio
  MCP server and the desired system-wide multi-agent service

Effort: L
