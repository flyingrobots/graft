# Daemon worker pool is carrying too much lifecycle and execution glue

`src/mcp/daemon-worker-pool.ts` currently owns:

- pool sizing and worker bootstrap
- IPC message dispatch and correlation
- task queue management
- worker failure handling and respawn
- shutdown semantics and in-flight rejection policy

Why this is debt:

- scheduler pressure and fairness work will add more policy around
  prioritization, queue classes, and worker health
- more worker kinds will make the current "monitor tick plus lifecycle"
  bundle harder to extend without accidental coupling
- restart and crash semantics should be easier to reason about than one
  module owning both scheduling-adjacent policy and raw child-process
  lifecycle

Desired end state:

- separate worker host lifecycle from job-queue dispatch
- make IPC protocol and task routing a narrower seam
- keep per-worker-class execution adapters small and testable

Effort: M
