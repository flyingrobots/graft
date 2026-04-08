# System-wide multi-repo agent coordination

Design how Graft should behave when multiple agents are working across
different repositories on the same machine at the same time.

Questions:
- what state should remain strictly per-repo versus system-wide?
- what is the canonical identity for "a repo" in the system-wide view:
  - `git rev-parse --git-common-dir`
  - `git rev-parse --show-toplevel`
  - both, at different layers?
- how should a persistent monitor or control plane represent many repos
  concurrently without collapsing them into one noisy stream?
- what coordination is useful across repos:
  - health / liveness
  - backlog pressure
  - active agent count
  - resource contention
  - cross-repo provenance / dependency hints
- how should multiple worktrees of the same repo appear in the
  system-wide view?
- how should system-wide coordination relate to per-client MCP session
  state like budget, cache, and saved state?
- how do system-wide views avoid becoming an authorization side channel
  for repos or sessions that a client has not bound?

Deliverables:
- explicit system model for multi-repo simultaneous agent activity
- boundary between canonical repo identity, live worktree identity, and
  client session identity
- boundary between repo-local truth and system-wide coordination
- follow-on backlog split for any required control-plane or storage work

Current design leaning:
- canonical repo identity should likely key off
  `git rev-parse --git-common-dir`
- live workspace / policy identity should likely key off
  `git rev-parse --show-toplevel`
- agent-local state should remain per MCP session rather than becoming
  accidental global daemon state
- coordination should stay observational; it must not widen workspace
  access or expose another session's receipts by default

Why separate cycle:
- this is a product / control-plane design problem, not just a watcher
  detail

Effort: L
