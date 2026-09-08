---
title: Bounded WARP resident LRU
legend: WARP
source_pr: 251
status: implementation
---

# Bounded WARP resident LRU

## Hill

Graft's shared daemon pool keeps at most four graph handles resident by default. Only operations
in flight pin them. A recently used idle handle is reused; an older idle
handle is evicted when another graph needs its slot. Open workspaces and
long-lived transport sessions do not pin graph memory between operations.

James requested LRU after a controlled reproduction showed one retained
checkpoint handle using 102.5 MiB of post-GC JavaScript heap, two using
180.2 MiB, and release returning the heap to 18.6 MiB. The vanished 7 GB
incident remains unattributed. A one-file observer incurred the same graph
materialization cost. Handle count is therefore useful but is not a byte
budget or a guarantee about process RSS.

This packet supersedes the binding-lifetime pins and unconditional
last-release eviction in [the original lease packet](WARP_leased-resident-working-set.md).
Independent invocation ownership, captured workspace routing, durable
reconstruction, failure cleanup, and shutdown admission obligations remain.
The original packet records the earlier implementation, not the new policy.

## Resident policy

- Identity stays `(repoId, writerId)`, including distinct session writer lanes.
- The finite capacity includes opening reservations and loaded handles.
- Default capacity is four. `GRAFT_WARP_MAX_RESIDENTS` accepts an integer from
  1 through 64; invalid explicit values reject construction before resources
  such as daemon workers are started. The pool also accepts injected options.
- Successful acquisition and final release update recency. Inspection does not.
- Misses evict the least recently used unpinned handle before opening another.
- The pool never evicts an opening or pinned handle. When every slot is pinned,
  a new key fails with `WARP_RESIDENT_CAPACITY`; no extra graph or wait queue is
  created. Same-key acquisitions can still share the pinned handle.
- Final release makes an entry idle. A configurable idle count of zero keeps
  the earlier eager-release policy for callers that need it; production uses
  the resident capacity as the idle limit.
- A released lease cannot yield its app again and drops its own strong app
  reference. Releasing twice cannot decrement another owner's pin.
- An idle handle constructed through a different worktree root is reopened
  through the newly resolved root. An in-flight handle remains pinned.
- Eviction drops only reconstructible process state. It does not delete Git
  objects, index records, workspace membership, authorization, or source files.

## Ownership and operation boundaries

Bindings retain routing and session-slice metadata, not a graph app or a graph
lease. Normal bound calls already capture a `WorkspaceExecutionContext`; that
context owns any lazily acquired resident through handler and attribution
settlement, then releases it in `finally`.

Binding initialization, rebind history, and router history operations outside
an invocation use explicit operation-scoped leases. A rebind can temporarily
need both previous and next graphs. If capacity prevents optional graph-backed
history, the existing unavailable-history path must remain explicit; it may
not open past the bound or rewrite binding identity. A graph request requiring
WARP propagates the typed capacity error through the existing error surface.

Direct tool-context graph access requires a captured execution capability.
There is no unowned raw router graph getter. Session retirement closes new
router admission and settles pending initialization; it cannot revoke a
capability already owned by a running invocation. Closing a session does not
force eviction of an otherwise useful idle entry; the finite LRU bounds it.

## Acceptance and calibration

Tests use deterministic acquisitions, explicit promise barriers, and an
independent recency model. No sleeps or RSS percentage gates establish policy.
The capacity/eviction oracle is the port's construction and query behavior:

1. At capacity two, use A, B, A, C: B must be reconstructed on its next use;
   the recently used A remains reusable until displaced by later accesses.
2. An in-flight A cannot be evicted while idle B can. When both are pinned,
   acquiring C fails without invoking its opener or exceeding the bound.
3. Concurrent same-key requests share one opening reservation, and a rejected
   or synchronously throwing opener frees that reservation without affecting
   a sibling or replacement entry.
4. Independent same-owner leases and idempotent release preserve pin counts.
5. Generated bounded acquire/release traces agree with a small reference model;
   retain named eviction and admission counterexamples.
6. With several sessions still bound, completed graph calls become evictable;
   active/opened workspace identities survive eviction and later reconstruction.
7. A paused invocation survives rebind, transport retirement, and LRU pressure,
   keeping its recorded repository and writer lane until it settles.
8. A real Git-backed structural projection survives eviction and reopen; its
   required witness count is nonzero. An idle handle can reopen through a new
   worktree root when the original construction root is no longer appropriate.
9. Status/inspection calls do not alter eviction order. Configuration rejects
   invalid explicit limits. The cold policy still supports eager final release.

Observe RED against the pre-LRU implementation. Use targeted mutations for
claims not calibrated by that RED: omit recency updates, ignore pins, and allow
capacity overflow. Numeric memory samples are supporting experiments only.
Run focused pool, invocation, workspace, and transport suites plus lint,
typecheck, build, and the canonical isolated test suite before readiness.

## Playback questions

- Agent: can a fifth idle session still use its workspace with capacity four?
- Human: do earlier graph handles leave memory eligibility when a new graph is
  used, while current sessions and their routes remain intact?
- Reviewer: which operation owns each pin, and what settles it on failure?
- Can a miss exceed the cap, including while another open is pending?
- Does the reconstruction witness query durable data rather than reuse a
  saved app? Does each generated trace report its seed and action prefix?

## Non-goals and inherited debt

This does not change the HTTP transport, package structure, graph schema,
source freshness semantics, scheduler, worker-process memory limits, file
observation cache, or queue admission. It does not estimate exact per-graph
bytes, force GC, promise immediate RSS reduction, add timers, or build a new
dashboard. Large single graphs and checkpoint decoding amplification still
need separate work. Detailed same-user owner inventory remains an explicitly
deferred inspector capability; resident totals alone do not explain ownership.

Existing PR #251 review findings remain required repair work before merge.
Changing cache policy does not silently close those findings or grant release
authority. Record actual validation and remaining gates in the local retro.

## Follow-on records

- [Resident owner inventory](../method/backlog/bad-code/WARP_resident-owner-inventory.md)
  records the explicit deferral of detailed ownership playback.
- [Memory budget beyond resident count](../method/backlog/bad-code/WARP_resident-count-is-not-a-memory-budget.md)
  records single-graph amplification and worker memory as separate work.
- Existing [local-history currency debt](../method/backlog/bad-code/WARP_bijou-local-history-stale-after-branch-transition.md)
  remains open. Warm handle reuse is not validation against another writer or
  current source; this cache policy supplies no new freshness guarantee.

## Inherited cleanup review repairs

The following remaining PR findings have independent RED/GREEN obligations:

1. A rejected initial transport request retires only the newly allocated
   session before returning the error; existing sessions remain registered.
2. Synchronous transport/server construction failure removes its scratch
   directory and closes any successfully constructed resources.
3. Unix socket cleanup suppresses only `ENOENT`; other failures reach the
   shutdown aggregate after remaining stages settle.
4. Signal-triggered shutdown catches and reports failure once, selects a
   nonzero exit status, and produces no unhandled rejection.
5. Session release waits for both router cleanup and startup-event settlement,
   then reports aggregate failures. A startup failure cannot short-circuit
   pending cleanup.

Use actual local transport/registry observations for session rollback and
controlled promise barriers for settlement. Fault injection targets resource
boundaries; assertions concern remaining resources, error identities, and exit
posture. These repairs do not add workload controls or a new observer surface.

The in-process daemon test harness inherits the same all-stage cleanup rule:
a failed session close must not skip later sessions, monitor/worker shutdown,
or scratch removal. Verify this with a controlled session-release failure and
actual scratch ownership, so a failing test does not contaminate later tests.
