# System-wide multi-repo agent coordination

Design how Graft should behave when multiple agents are working across
different repositories on the same machine at the same time.

Questions:
- what state should remain strictly per-repo versus system-wide?
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

Deliverables:
- explicit system model for multi-repo simultaneous agent activity
- boundary between repo-local truth and system-wide coordination
- follow-on backlog split for any required control-plane or storage work

Why separate cycle:
- this is a product / control-plane design problem, not just a watcher
  detail

Effort: L
