# Daemon job scheduler and worker pool

Introduce an explicit scheduler for heavy daemon work instead of
executing repo-scoped jobs directly on the request path.

Why:
- one hot repo or slow request can still delay unrelated daemon
  sessions
- fairness needs a real execution model, not just monitoring
- background monitor ticks should compete lawfully with foreground work

Deliverables:
- session-slice identity for queued work
- immutable job envelope contract
- result-delta protocol back to the daemon control plane
- bounded queue and worker status inspection
- fairness posture across repos, with lower-priority background work

Questions:
- v1 `worker_threads` or child processes
- one active interactive job per session or looser concurrency
- cancellation, timeout, and retry posture

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/WARP_logical-writer-lanes.md`
- `docs/method/backlog/up-next/SURFACE_monitors-run-through-scheduler.md`

Effort: L
