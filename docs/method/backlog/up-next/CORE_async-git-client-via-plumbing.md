# Async Git client via plumbing

Replace the synchronous `GitClient` execution path with an async
adapter backed by `@git-stunts/plumbing`.

Why:
- daemon-mode Git work still routes through `spawnSync`
- one slow Git command can block unrelated daemon sessions
- Graft already depends on `@git-stunts/plumbing` for WARP open, so the
  substrate is present but underused

Scope:
- make `GitClient` async
- replace `src/adapters/node-git.ts` with a plumbing-backed adapter
- migrate repo-state, workspace binding, monitor runtime, structural
  diff helpers, and precision helpers onto the async seam
- keep runtime truth explicit when Git exits non-zero

Non-goals:
- worker-pool scheduling
- filesystem port migration
- changing WARP writer identity policy

Related:
- `docs/design/0058-system-wide-resource-pressure-and-fairness/system-wide-resource-pressure-and-fairness.md`
- `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`

Effort: M
