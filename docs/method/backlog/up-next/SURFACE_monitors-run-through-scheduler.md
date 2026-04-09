# Monitors run through scheduler

Route persistent monitor ticks through the same scheduler and pressure
model as foreground daemon work.

Why:
- background indexing should not silently starve interactive agents
- fairness is incomplete if monitors keep bypassing queueing
- daemon-wide pressure needs one truthful source of work accounting

Deliverables:
- monitor tick jobs enqueued with explicit priority
- per-repo backlog and lag signals derived from scheduler-aware state
- clear monitor lifecycle semantics when the scheduler is saturated or
  unavailable

Non-goals:
- new monitor kinds beyond `git_poll_indexer`

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`
- `docs/method/backlog/cool-ideas/WARP_background-indexing.md`

Effort: M
