# System-wide resource pressure and fairness

Source backlog item: `docs/method/backlog/up-next/SURFACE_system-wide-resource-pressure-and-fairness.md`
Legend: SURFACE

## Sponsors

- Human: TBD
- Agent: TBD

## Hill

Make daemon-side fairness real by moving heavy repo work off the daemon
request loop and onto an explicit scheduler, without lying about WARP
writer semantics or collapsing session-local state into a fake global
store.

## Playback Questions

### Human

- [ ] Can one hot repo or one slow request no longer starve unrelated
      daemon sessions by default?
- [ ] Is the scheduling model explicit about what is fair per repo,
      per session, and per worker kind?
- [ ] Are WARP writer identities stable and meaningful, rather than
      tied to incidental worker-process IDs?

### Agent

- [ ] Is `GitClient` async and backed by `@git-stunts/plumbing`
      instead of synchronous shell execution?
- [ ] Is the filesystem posture async on daemon-heavy request paths,
      with remaining sync reads treated as deliberate debt rather than
      default behavior?
- [ ] Does the daemon keep session state authoritative in-process while
      workers execute against immutable snapshots and return deltas?
- [ ] Are WARP writes modeled as logical writer lanes instead of a
      single hard-coded writer or executor-derived writer IDs?
- [ ] Do background monitors run through the same pressure and fairness
      scheduler as foreground repo work?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: keep the control plane
  explicit and small:
  - daemon owns session state, authorization, scheduling, receipts
  - workers execute jobs, not authority
  - logical writer lanes own WARP provenance, not physical workers
- Non-visual or alternate-reading expectations: operator-facing
  pressure surfaces must stay bounded and machine-readable, not log
  spelunking.

## Localization and Directionality

- Locale / wording / formatting assumptions: daemon status and pressure
  surfaces remain machine-oriented English identifiers.
- Logical direction / layout assumptions: no UI-specific assumptions in
  this cycle.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - whether a request ran inline or through the scheduler
  - which queue or lane accepted it
  - whether pressure is per repo, per session, or daemon-wide
  - what writer lane produced any WARP mutation
- What must be attributable, evidenced, or governed:
  - session-local policy snapshots used for a queued job
  - queue depth, wait time, and worker occupancy
  - daemon-visible backlog and lag by repo
  - capability limits on daemon-mode tools even when work is queued

## Non-goals

- [ ] Process isolation for every session in v1.
- [ ] Per-core affinity as a product contract.
- [ ] Worker IDs as graph provenance.
- [ ] Pretending worktrees have isolated `refs/warp/...` namespaces.
- [ ] Shipping full fairness enforcement before pressure is observable.

## Backlog Context

After the multi-repo overview exists, make daemon-wide pressure and
fairness explicit across many repos.

Goals:

- surface backlog pressure across repo-scoped monitors without
  collapsing all repos into one noisy stream
- define fair scheduling so one hot repo does not starve others
- make failure, lag, and inactivity visible in a bounded machine-
  readable way
- keep fairness observational and local-user, not permission-granting
- move general Git request paths off synchronous `spawnSync`
- move daemon-heavy filesystem reads off synchronous port usage
- keep session state authoritative in the daemon while workers execute
  from immutable job snapshots
- model WARP mutation with logical writer lanes rather than one global
  writer ID or worker-derived writer IDs

Questions:

- what signals matter most:
  - backlog size
  - time since last successful monitor run
  - active session count
  - recent tick cost
  - failing monitor count
- should fairness apply per repo, per worker kind, or per daemon
  session demand
- how should this relate to future same-repo concurrent-agent work
- what is the minimal job envelope needed for workers:
  - validated tool args
  - binding snapshot
  - session depth / budget snapshot
  - cache hints
- which work stays inline:
  - cheap control-plane tools
  - authorization and bind bookkeeping
- which work must be queued first:
  - monitor ticks
  - WARP indexing
  - repo-scoped structural reads and scans
- should v1 workers be `worker_threads` or child processes

Related:

- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/cool-ideas/WARP_background-indexing.md`
- `docs/method/backlog/up-next/CORE_async-git-client-via-plumbing.md`
- `docs/method/backlog/up-next/CORE_async-filesystem-port-on-request-paths.md`
- `docs/method/backlog/up-next/SURFACE_daemon-job-scheduler-and-worker-pool.md`
- `docs/method/backlog/up-next/WARP_logical-writer-lanes.md`
- `docs/method/backlog/up-next/SURFACE_monitors-run-through-scheduler.md`

## Design leaning

- daemon remains the control plane:
  - session registration
  - workspace authorization and binding
  - request routing
  - receipt construction
  - queueing, cancellation, and metrics merge
- session-local state remains in daemon memory:
  - tracker
  - cache
  - metrics
  - repo-state observations
- queued jobs target a session slice, not a bare session, so rebind
  can create a fresh slice without corrupting in-flight work
- workers execute against immutable job envelopes and return deltas,
  not direct state mutation
- cheap control-plane tools may stay inline; heavy repo work must move
  onto the scheduler
- WARP provenance should belong to logical lanes such as
  `graft_monitor_<repoId>` or `graft_repo_<repoId>_index`, not
  `graft_worker_<n>`
- fairness should be across repos first; background monitor work should
  run at lower priority than foreground interactive work

## First tranche

1. Make `GitClient` async and back it with `@git-stunts/plumbing`.
2. Convert daemon-heavy filesystem request paths to async reads.
3. Add a daemon scheduler contract:
   - session slice IDs
   - job envelopes
   - worker result deltas
4. Introduce logical writer lanes for WARP mutation jobs.
5. Route persistent monitor ticks through the scheduler and surface
   daemon-wide pressure.

Effort: M
