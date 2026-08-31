---
title: "Leased WARP resident working set"
legend: "WARP"
cycle: "WARP_leased-resident-working-set"
source_pr: 251
---

# Leased WARP resident working set

Source repair: PR #251 review. No backlog item or design packet preceded the
implementation; the local Retro must record that process drift.

Legend: WARP

## Sponsors

- Human: James
- Agent: Codex

## Hill

The daemon keeps only a reconstructible, explicitly owned WARP working set in
memory. Every resident writer lane has a derived identity, every strong
reference is represented by a releasable capability, and the last release
automatically removes the resident from the shared pool. A later request can
reopen the same durable WARP graph without changing its observable structural
answer.

The implementation must make these claims true together:

- a resident is one logical WARP writer lane, not an entire repository;
- binding-cache membership, transport-session lifetime, and in-flight request
  lifetime are separate ownership scopes;
- normal code cannot obtain a pooled `WarpApp` without an owned lease;
- failed opens, rebinds, authorization changes, LRU churn, transport closure,
  and concurrent release/acquire races cannot leak or prematurely revoke a
  lease; and
- zero-reference residents are removed by production lifecycle code, without
  relying on a test-only sweep or a force-eviction escape hatch.

## Derived identity

The resident key is `(repoId, writerId)`.

- `repoId` is derived from the canonical Git common directory by workspace
  resolution. WARP persistence is repository-scoped through that common Git
  directory, so `worktreeId` is not a second durable graph identity.
- `writerId` names the logical mutation lane. Session and monitor lanes are
  distinct even when they target the same repository.
- `worktreeRoot` is construction evidence for the Git plumbing adapter. It
  must resolve to the same canonical repository represented by `repoId`, but
  it is not part of the resident key.
- `transportSessionId`, binding ID, and invocation ID are owner metadata. They
  identify why a capability exists; none of them may collapse multiple
  acquisitions into one reference.

This identity follows the landed logical-writer-lane contract in
`docs/design/WARP_logical-warp-writer-lanes.md`. The production daemon
composition root must pass the requested `writerId` into `openWarp`; silently
falling back to the default `graft` writer violates the key.

## Durable substrate and reconstruction

The resident `WarpApp` is an in-process view over durable WARP state stored by
the Git-backed graph adapter in the repository's common Git directory. The
resident may retain Git plumbing, graph state, indices, and caches, but those
objects are not the authority that makes the graph durable.

After the last lease is released, the pool drops its strong reference. The
next acquisition page-faults the resident back through `openWarp` using the
same repository, graph name, and logical writer ID. A playback test must show
that a bounded structural query before release and after reconstruction is
semantically identical.

The reconstruction witness uses the real Git graph adapter: it indexes a
committed symbol, captures a bounded structural log, releases the final lane
capability, verifies the resident is absent, reopens through `openWarp`, and
compares the reconstructed log value-for-value. A mutation retaining the old
resident fails before reopen, proving the witness cannot pass on cache reuse.

This cycle does not claim that every daemon cache or workspace slice is paged.
It bounds only the shared WARP resident pool.

## Ownership model

The application-owned pool port exposes acquisition, not raw cache lookup:

```ts
interface WarpResidentKey {
  readonly repoId: string;
  readonly writerId: string;
}

interface WarpResidentLease {
  readonly key: WarpResidentKey;
  readonly app: WarpApp;
  release(): Promise<void>;
}

interface WarpResidentPool {
  acquire(input: {
    readonly key: WarpResidentKey;
    readonly worktreeRoot: string;
    readonly ownerId: string;
  }): Promise<WarpResidentLease>;
  size(): number;
  residentCount(): number;
}
```

- acquisition and release are required port operations;
- each successful acquisition returns a unique lease token, including two
  acquisitions with the same `ownerId`;
- `release()` is idempotent for its own token;
- callers cannot force-delete a resident owned by another capability; and
- inspection or administrative eviction does not weaken the application port.

Test fakes must implement this contract explicitly. Optional lifecycle methods
added only to keep old mocks compiling are not acceptable.

## Binding and invocation lifetimes

A `BoundWorkspace` may lazily hold a binding lease after its first WARP-backed
use so a hot current or routed binding can reuse its resident across calls.
That lease ends when the binding becomes unreachable through any terminal path:

- successful rebind releases the previous current binding;
- authorization rejection releases the rejected routed binding;
- routed-binding LRU removal releases the removed binding;
- post-open binding setup failure releases the uncommitted binding; and
- daemon-session termination releases the current binding and every routed
  binding.

Current-binding commits are serialized from predecessor capture through
history and authorization publication, pointer replacement, and release of the
exact displaced capability. Concurrent rebind preparation may overlap, but
each commit observes the binding installed by the prior successful commit; a
later winner therefore cannot strand the earlier winner's lease.

A same-resident rebind transfers only a successfully acquired, unreleased
resident capability. A lazy or still-opening binding wrapper is not path-
neutral: its opener retains the worktree root captured at construction. The
replacement binding therefore receives a new lazy wrapper rooted at its own
canonical worktree, and the predecessor is released after commit.

An in-flight execution cannot borrow the binding's lease. Capturing a
`WorkspaceExecutionContext` creates or lazily acquires a distinct invocation
lease, and the invocation engine releases it in `finally`. Therefore removing
the cache entry or closing the session cannot invalidate an app still used by
an admitted invocation.

Invocation ownership is independent of scheduler admission. Every bound daemon
repository call captures an execution capability, including unscheduled graph,
history, status, and attach operations, while only the established routed tool
set enters the daemon scheduler. All workspace/history projections inside that
call use the captured execution scope rather than consulting a binding that may
be replaced concurrently.

Any execution context created outside the invocation engine owns the same
obligation locally. Read-attribution fallback releases its internally captured
context in `finally`, while status-only causal projection reads the current
binding directly and creates no execution lease.

Binding disposal and invocation disposal must both be idempotent. A binding is
not a lease, a transport session is not a lease, and an LRU entry is not a
lease; each can own one or more explicit lease capabilities.

Every routed-cache removal goes through one exact-entry disposer. Authorization
rejection, same-worktree identity replacement, and LRU overflow remove and
release the displaced binding, while an older asynchronous disposal may not
delete a newer cache entry installed at the same worktree key. A rejected route
also awaits and disposes an initialization already admitted for that key.

## Pool state machine

For each resident key, the pool owns one identity-stable entry:

```text
absent
  -> opening(refs >= 1, exact open promise)
  -> resident(refs >= 1, app)
  -> absent (last release)
```

Required transitions:

1. An acquisition installs its unique reference before awaiting the open, so
   ordinary eviction cannot remove a pending open that still has a claimant.
2. Concurrent acquisitions of one key share the exact opening promise but own
   separate lease tokens.
3. Open failure rejects every waiter, removes only the entry containing that
   exact failed promise, and leaves no phantom reference.
4. Release removes only its own token. The last release removes the exact
   current entry synchronously from the pool's strong-reference map.
5. A late rejection or release from an older entry cannot delete a replacement
   entry for the same key.
6. Different writer lanes in one repository transition independently. A live
   monitor or session lane cannot pin dead lanes in the same repository.

The first implementation uses eager last-release eviction. A future bounded
zero-reference cache may be designed separately, but it must have an explicit
capacity and deterministic policy before replacing eager eviction.

## Failure and shutdown semantics

- If opening fails, acquisition fails and no lease is published.
- If binding setup fails after acquisition, rollback awaits release and
  preserves both the primary failure and any cleanup failure.
- Repo-local startup applies the same rollback before publishing its initial
  binding; failed repo-state or persisted-history setup cannot pin an
  unreachable resident for the server lifetime.
- Routed binding setup failure unregisters its never-published binding
  capability; a failed route cannot accumulate unreachable session-owned lease
  wrappers.
- Session termination invokes the server/router residency disposer exactly
  once for transport close, transport error, idle expiry, explicit disconnect,
  and daemon shutdown.
- Daemon shutdown closes session admission before its first await, drains every
  initialization already admitted, and only then snapshots sessions for
  transport, lease, and directory cleanup.
- A session published before MCP transport connection settles rolls back
  through the same memoized retirement owner if connection fails; the failure
  is not returned while its control-plane record, leases, or directory remain.
- Outer daemon shutdown attempts session, monitor, worker, HTTP, and socket
  cleanup in order even when an earlier stage fails, then reports every failure
  as one aggregate.
- Cleanup may release binding leases while admitted invocations remain active;
  their independent invocation leases keep the resident alive.
- The daemon's shared pool opener must preserve the requested logical writer
  ID.
- Pool release does not erase durable Git-backed WARP data. It only removes the
  in-process resident.

## Acceptance criteria

- [x] The required application port returns an owned lease and has no optional
      lease lifecycle or ordinary force-eviction method.
- [x] Resident identity is exactly `(repoId, writerId)`, and production
      `openWarp` receives both the canonical worktree root and requested writer
      ID.
- [x] Two same-owner acquisitions of one resident remain valid until both
      unique leases release.
- [x] A failed open leaves zero references and cannot remove a newer
      replacement entry.
- [x] The last release automatically removes that writer-lane resident from
      production pool state.
- [x] One live writer lane does not retain an unreferenced sibling lane in the
      same repository.
- [x] Successful A-to-B rebind releases A only after B commits, while a
      same-resident rebind transfers the existing holder.
- [x] An unacquired same-resident rebind opens from the replacement worktree
      even if the prior linked worktree is removed after commit.
- [x] Concurrent cross-resident rebind commits each observe and release their
      actual predecessor; only the final binding remains resident.
- [x] Failed rebind retains A and releases any uncommitted B lease.
- [x] Failed routed repo-state initialization releases and unregisters the
      never-cached binding capability without disturbing current bindings.
- [x] Failed repo-local startup initialization releases and unregisters its
      unpublished binding capability before rejecting server readiness.
- [x] Routed authorization rejection, same-key replacement, and LRU removal
      release only their exact displaced binding leases.
- [x] An in-flight routed invocation survives binding LRU removal without
      eviction or duplicate opening, then releases at settlement.
- [x] Bound unscheduled graph, history/status, and causal-attach invocations
      retain their captured resident through concurrent rebind and release it
      at settlement without changing scheduler admission.
- [x] Internal read attribution releases its materialized execution lease, and
      status-only causal projection creates no execution capability.
- [x] Normal session termination releases every binding owned by that session.
- [x] Shutdown rejects initialization crossing the admission boundary and
      drains earlier initialization before cleanup snapshots the session set.
- [x] Failed MCP transport connection rolls back an already published daemon
      session before returning the initialization failure.
- [x] A session cleanup failure cannot prevent monitor, worker, HTTP, or socket
      shutdown; all stage failures are reported after every stage is attempted.
- [x] Reopening an evicted resident reconstructs an equivalent bounded WARP
      projection from durable Git-backed state.
- [x] Health and documentation distinguish resident writer-lane count from
      repository count and do not claim to bound unrelated daemon memory.

## Playback questions

### Human

- [ ] Can I see exactly which `(repoId, writerId)` residents are held and why?
- [x] Does a closed or rebound session stop retaining every lane it no longer
      uses?
- [x] If all residents disappear between calls, does the next call reconstruct
      the same structural answer?
- [x] Is the documented memory claim limited to the WARP pool actually bounded
      by this cycle?

### Agent

- [x] Is it impossible to obtain a pooled `WarpApp` without a releasable
      capability?
- [x] Can two bindings or invocations with the same session and repository be
      released independently?
- [x] Can cache churn, authorization revocation, or session termination race an
      in-flight invocation without premature eviction?
- [x] Do mutation tests fail when writer propagation, exact-entry fences,
      unique reference accounting, or terminal release is removed?

## Test strategy

Use deterministic deferred promises and counted fake openers. Each lifecycle
fault gets a focused RED witness before GREEN:

- pool contract tests for unique leases, lane-granular eviction, failed opens,
  exact-entry replacement fences, idempotent release, and reconstruction;
- router tests for rebind commit/rollback, same-repository multi-binding,
  authorization rejection, LRU churn, and in-flight context ownership;
- daemon tests for normal/error/idle/shutdown session termination; and
- a composition-root test proving the requested writer ID reaches `openWarp`.

Tests assert resident identity, counts, open calls, and observable structural
results. They do not assert Markdown formatting, diagnostic prose, or private
map layout.

## Non-goals

- [ ] Bounding every daemon cache, worker-process heap, parser cache, or
      workspace slice in this cycle.
- [ ] Replacing logical writer-lane identity or changing durable WARP schema.
- [ ] Treating `worktreeId` as a second repository graph identity.
- [ ] Adding nondeterministic finalizers, weak-reference cleanup, or a timer-
      based eviction policy.
- [ ] Exposing force eviction to ordinary request-path code.
- [ ] Claiming a measured RAM reduction without a separate reproducible memory
      experiment.

## Related design truth

- `docs/design/WARP_logical-warp-writer-lanes.md`
- `docs/design/local-daemon-transport-and-session-lifecycle.md`
- `docs/design/system-wide-resource-pressure-and-fairness.md`
- `ARCHITECTURE.md`
