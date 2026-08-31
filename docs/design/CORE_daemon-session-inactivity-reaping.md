---
title: "Daemon session inactivity and orphan reaping"
---

# Daemon session inactivity and orphan reaping

Source pull request: [flyingrobots/graft#250](https://github.com/flyingrobots/graft/pull/250)
Previous packet: [Local daemon transport and session lifecycle](./local-daemon-transport-and-session-lifecycle.md)
Legend: CORE

## Sponsors

- Human: James
- Agent: Codex

## Status

Hill met locally on the repaired PR #250 branch. Every acceptance criterion
below has executable evidence, the local Retro records the cycle, and the
exact-tree isolated suite passes 259 files and 2,112 tests. Current-head CI and
third-party review remain separate Ship gates.

Writing the contract after implementation is a process failure, not a precedent.
The cycle retro must record that the PR was published before its design and
retro gates existed.

## Hill

A long-lived local Graft daemon keeps only live MCP sessions and their owned
scratch directories resident:

- an idle session becomes eligible only after the configured **monotonic
  elapsed duration**;
- a request protects its session from the moment an existing session ID is
  admitted, including request-body streaming, until request handling settles;
- eligibility causes one idempotent terminal transition that revokes the
  session, closes its MCP transport/protocol, and attempts bounded scratch
  cleanup exactly once;
- cleanup failure is visible and retryable rather than reported as deletion;
- directories abandoned by process failure are discovered under exclusive
  daemon-root ownership and removed without following links or touching
  unknown paths; and
- invalid timing configuration fails before a timer, listener, session, or
  scratch mutation exists.

The goal is bounded session-owned state, not merely a timer that deletes map
entries.

## Existing failure posture

The held implementation has useful direction but does not yet prove the hill:

- its in-flight test starts no request and asserts ordinary reaping;
- an existing-session POST is unprotected while its body is being read;
- production elapsed time defaults to `Date.now()`;
- invalid TTLs and overflowing Node timer delays are accepted;
- the sweep sees only the current process's in-memory map;
- session construction has no rollback after scratch creation;
- teardown is duplicated across transport callbacks, the reaper, and host
  shutdown; and
- a swallowed directory-removal error is still counted as successful reaping.

These are lifecycle defects in one model. Repairs must converge on that model
rather than add another callback-specific cleanup path.

## Session state machine

```text
CREATING
  | connect + register commit
  v
OPEN  -- beginRequest --> OPEN(activeRequests + 1)
  |                         |
  |                         +-- endRequest --> OPEN(activeRequests - 1,
  |                                               lastActivity = monotonicNow)
  |
  +-- explicit close / transport failure / daemon close
  |      / eligible idle sweep
  v
TERMINATING -- one shared termination promise --> TERMINATED
```

Only `OPEN` sessions accept work. `TERMINATING` is entered synchronously before
the first cleanup `await`, and the map entry is removed only if it still points
to the same session object. That identity check prevents an old callback from
deleting a newer replacement with the same logical key.
Generated session IDs are also reserved across creating, open, and terminating
states, so concurrent construction cannot create that replacement while the
prior session still owns its scratch directory. Reuse becomes legal only after
the terminal operation releases the identity.

Every terminal cause calls one `terminateSession(session, cause)` operation:

1. atomically reuse or create the session's termination promise;
2. transition to `TERMINATING` and remove the exact map entry;
3. unregister the exact control-plane transport once;
4. close the connected MCP protocol/transport once;
5. attempt scratch-directory removal through the bounded session-directory
   owner; and
6. transition to `TERMINATED` with a structured cleanup outcome.

Transport `onclose`/`onerror` callbacks may trigger this operation, but they do
not implement their own cleanup. Host shutdown awaits every termination promise.
The design does not claim that `GraftServer` itself has a `close()` method; the
connected MCP protocol owns and closes its transport.
When a transport callback initiates the transition and no synchronous caller can
receive its result, one observer emits structured cleanup failures or a rejected
termination. Callbacks caused by an existing idle/shutdown transition do not add
another observer or duplicate its diagnostics.

A terminating session ID remains reserved from orphan discovery until its shared
termination promise settles. Removing the session from request authority must
not make its scratch tree concurrently eligible for a second cleanup path.

The host itself has an explicit `OPEN -> CLOSING -> CLOSED` lifecycle. Entering
`CLOSING` synchronously rejects new construction commits and new sweeps. Shutdown
awaits every construction already admitted, the one serialized sweep, every
termination already in flight, and every termination initiated while that fence
is closing; it then terminates all remaining committed sessions. Once closed,
the public sweep capability is revoked; no session-root mutation may outlive
daemon-root ownership.

## Request activity boundary

For an existing `mcp-session-id`, request protection begins after header/session
validation and **before the next await**. In particular, POST body parsing is
inside the protected region:

```text
lookup exact OPEN session
beginRequest()
try
  read/parse body if POST
  touch control-plane transport
  await transport.handleRequest(...)
finally
  endRequest(monotonicNow)
```

Initialization has no prior session to reap. Its newly constructed session is
not published to the map or control plane until connection succeeds, and the
initialize request enters the same protected region before transport handling.

`activeRequests` is an exact reference count, not a boolean and not a `Set` of
session IDs. Concurrent POST and streaming GET requests each own one count.
Underflow is a lifecycle error; it is never hidden with `Math.max(0, ...)`.

An idle sweep may transition a session only when:

```text
state == OPEN
activeRequests == 0
monotonicNow - lastActivityAtMs >= inactivityTtlMs
```

The check and transition to `TERMINATING` are synchronous. Once that transition
starts, a later request observes an unknown/closed session and cannot race into
the object while cleanup awaits.

## Monotonic elapsed-time contract

Inactivity is duration, not civil time. Production uses a dedicated
`MonotonicClock` backed by `performance.now()`, never `Date.now()`. The clock's
epoch is deliberately meaningless; only differences inside one process are
stored.

The injected test clock obeys the same contract. Every sample must be finite,
non-negative, and greater than or equal to the previous sample. A bad sample or
clock regression fails closed: the sweep reaps nothing and returns a structured
clock failure. It must not clamp, reinterpret wall time, or expire a session.
If request start or settlement encounters a bad sample, the session retains that
failure until later trusted request activity supersedes it or a valid sweep
reports it. That sweep retires nothing and rebases the idle epoch to its trusted
sample; eligibility requires a full TTL after the rebase. A sweep reports and
rebases exactly one retained session failure. Other sessions keep their failures
for later sweeps, ensuring every rejected sample remains observable rather than
being cleared behind the first report. Because one session's terminal cleanup
may await while the sweep still holds its original trusted sample, the sweep
rechecks retained failure state immediately before every later terminal
transition and returns its partial counts if a new failure must be rebased.

Persisted orphan discovery does not compare monotonic timestamps from different
processes. Process-local clock values are never written as restart authority.

## Configuration contract

Timing options are validated once, before daemon startup side effects:

| option | admitted values | meaning |
|---|---|---|
| `sessionInactivityTtlMs` | positive safe integer | elapsed idle duration |
| `sessionReaperIntervalMs` | `0`, or integer `1..2_147_483_647` | `0` disables scheduling for manual/test stepping; positive values are safe Node timer delays |

`NaN`, infinities, fractions, negatives, unsafe integers, zero TTL, and timer
delays above `2_147_483_647` are typed configuration errors. Values are never
silently clamped. The defaults remain 30 minutes and 60 seconds.

Validation occurs before worker-pool construction, timer creation, socket bind,
or filesystem mutation so invalid configuration cannot leak partially started
daemon resources.

## Construction is transactional

Session creation owns a rollback stack. Scratch directory creation, server and
transport construction, MCP connection, map publication, and control-plane
registration either all commit or all unwind.

The session is published only after its MCP connection succeeds. If any prior
step fails, the partial protocol/transport is closed when present and the exact
scratch directory is removed. If cleanup itself fails, the failure is returned
and the directory remains discoverable by the orphan sweep; no phantom map or
control-plane entry survives.
Before a protocol connection is attempted, the transport remains a separately
owned resource and rollback closes it directly; after that ownership transfer,
protocol close owns transport close with direct close reserved as its fallback.
Rollback preserves the primary construction error plus every failed
control-plane, protocol-close, fallback transport-close, and directory-cleanup
operation in one aggregate error.

## Crash-orphan ownership and discovery

The sessions root is daemon-owned state. A daemon must establish exclusive
ownership of its configured daemon root before deleting anything under
`<graftDir>/sessions`. The ownership record binds a daemon instance identity,
process-birth witness, and endpoint. A live endpoint causes startup refusal.
Before the endpoint is bound, a process blocks takeover only while its observed
birth witness exactly matches the persisted witness; a recycled PID does not
count as the original daemon. Sharing one daemon root across independent live
endpoints is invalid.

Every owner-record publication, validation, quarantine, restoration, and
release runs under one filesystem claim. The claim is published only after its
record is complete, and its holder is identified by PID plus process-birth
witness. A dead claim is moved to a deterministic claim-ID tombstone that is
retained as an ABA fence: a delayed stale reclaimer cannot rename a newer claim
over the same non-empty tombstone. The live claim remains held across displaced-
owner inspection and restoration, so a third publisher cannot occupy the
canonical owner path during that gap.

Stale takeover and release quarantine the canonical owner entry, reread the
moved record, and delete it only when every identity field still matches the
record that authorized the move. If another owner replaced it in the interim,
the moved inode is linked back to the canonical path and takeover refuses.
New claims are written, flushed, and closed under a unique same-directory
candidate name. An exclusive hard link publishes that complete inode as
`daemon-owner.json`; an incumbent causes refusal without replacement.
Acquisition commits only after its temporary claim releases. A release failure
rolls back the exact published owner while the operation still owns the claim,
then retries the same exact released-claim tombstone cleanup before
propagating the original error. The failed caller never loses the only handle
capable of removing its published authority.

Startup creates the direct `sessions` child when absent and rejects it when an
existing path is a symbolic link or is not a directory. The shared orphan-scan
boundary opens and retains the original root handle, anchors its device/inode
identity, and revalidates the path after enumeration and before and after each
candidate inspection. Recursive removal begins only immediately after that
exact identity check, so a root replaced after startup or during a scan is
refused before cleanup. Permission repair targets the retained handle rather
than a separately resolved pathname. Live-session terminal cleanup derives the
exact direct-child root from the generated session UUID, pins that root, and
revalidates the same identity immediately before its recursive removal.

When a daemon uses a non-default endpoint, root acquisition first probes the
legacy `<graftDir>/mcp.sock` endpoint and refuses ownership while a
pre-ownership daemon is live there. The refusal occurs before publishing an
owner record or scanning session directories. Custom-endpoint startup and
periodic sweeps preserve every unmarked legacy UUID directory even when the
probe is initially quiet; they may still remove directories with valid Graft
ownership markers. This policy avoids a check-then-scan race if a legacy daemon
starts after the initial probe.

Startup order is:

1. validate configuration;
2. acquire exclusive daemon-root ownership before preparing or binding its
   transport path;
3. prepare and bind the transport path while returning HTTP 503 to keep MCP
   request admission closed;
4. initialize control-plane state;
5. scan and clean session-owned orphans; and
6. open request admission and report healthy.

If transport-path preparation or any later startup step fails, startup rollback
releases the acquired root claim after cleaning every resource it created.

Every new session directory contains an atomically written ownership marker
binding the daemon instance and session UUID. For migration, a direct child
whose basename is an exact UUID generated by the old flat layout is also an
eligible legacy orphan only for the default endpoint once exclusive root
ownership is established.

The scanner:

- pins the sessions-root handle and exact device/inode identity for the full
  scan;
- revalidates that identity after enumeration and immediately before candidate
  inspection and removal;
- enumerates only direct children of the canonical sessions root;
- uses `lstat` and never follows a symlink;
- deletes only a valid owned marker or an exact lowercase RFC 4122 version-4
  legacy UUID with generated variant bits when default-endpoint migration
  cleanup is enabled;
- excludes the exact canonical directories of current live session objects;
- leaves and reports unknown direct children, links, non-directories, and
  malformed, unreadable, or unsafe ownership markers; and
- uses explicit canonical targets, never a recursive glob or unresolved path.

Startup removes prior-process orphans. Each periodic sweep also discovers
current-process owned directories absent from the session map, covering a hard
failure between directory creation and rollback. Cleanup failures remain debt
for a later sweep and are never represented as successful deletion.
An initialization UUID is reserved before its first construction await and
remains protected from orphan discovery until either publication commits or
rollback finishes. If construction is admitted after an orphan scan has already
captured its initial live IDs, that UUID is synchronously added to the active
scan's reservation set before construction performs its first filesystem await.

Only one sweep may execute storage discovery at a time. Concurrent scheduled
or manual callers share the same in-flight result, and shutdown awaits that
operation before relinquishing root ownership. The interval scheduler also
admits at most one pending observer, so a blocked sweep cannot accumulate one
promise continuation or duplicate diagnostic per timer tick. A termination
owned by the captured sweep is excluded from shutdown's independent termination
collector, so its cleanup failures are aggregated exactly once through the
sweep result.

Signal-triggered shutdown consumes the close result. Cleanup rejection emits a
structured `DAEMON_SIGNAL_SHUTDOWN_FAILED` diagnostic and selects a nonzero
process exit status without replacing an existing nonzero status.

## Sweep result and observability

The sweep API is required, not optional, and returns facts rather than one
ambiguous count:

```text
SessionSweepResult
  sessionsRetired
  liveDirectoriesRemoved
  orphanDirectoriesRemoved
  cleanupFailures[]
    sessionId?
    path
    code
  preservedEntries[]
    entryName
    path
    reason
  sweepFailure?
    code
    reason
    received
    previousAcceptedMs
```

`sessionsRetired` means authority was revoked and terminal transition committed.
It does not imply directory removal. A refused sweep reports its machine-readable
failure separately from cleanup debt and retires nothing. Scheduled sweeps emit
structured refusal and cleanup diagnostics rather than silently discarding the
outcome.

`retryable` is factual, not aspirational. Directory-removal and orphan-scan
failures are retryable because later sweeps execute those operations again.
Protocol and fallback transport-close failures are non-retryable after session
authority has been retired, and each failed close layer is reported separately.

## Invariants

1. **No active-session reaping.** Every admitted request owns one activity
   reference from pre-body-read admission through final settlement.
2. **Monotonic inactivity.** Eligibility depends only on validated monotonic
   elapsed time within the current process.
3. **One terminal transition.** All close causes share one idempotent termination
   promise and one exact map/control-plane removal.
4. **Transactional construction.** Failed open leaves no published session,
   registration, connected transport, or unreported scratch residue.
5. **Crash-orphan closure.** Exclusive startup and periodic discovery cover
   owned directories absent from the in-memory map.
6. **Path-bounded deletion.** Cleanup never follows links or deletes unknown or
   non-session-owned children.
7. **Truthful outcomes.** Retirement, directory deletion, orphan deletion, and
   failure are separate structured facts.
8. **Validated scheduling.** Invalid TTL/timer/clock values cannot reach Node's
   timer APIs or daemon startup side effects.
9. **Post-request idleness.** The idle epoch is refreshed when request handling
   settles, including error paths; request start alone cannot begin the next TTL.
10. **No teardown ABA.** A late callback for an old session cannot remove or
    mutate a newer map entry.
11. **Authority-fenced shutdown.** Pending construction, sweep execution, and
    session termination settle before root ownership is released; post-close
    sweeps are rejected.
12. **Single cleanup owner.** Pending construction and terminating session IDs
    remain excluded from orphan discovery until their owning operation settles.

## Acceptance criteria

### Configuration and clock

- [x] Defaults resolve to a 30-minute positive safe-integer TTL and 60-second
      timer interval.
- [x] Table-driven tests reject every invalid TTL class independently.
- [x] Table-driven tests admit interval `0`, reject every other invalid interval
      class, and prove no value above Node's timer maximum reaches `setInterval`.
- [x] Production composition uses `performance.now()` through `MonotonicClock`;
      no session inactivity calculation uses `Date.now()`.
- [x] A regressing or non-finite injected clock causes a structured failed sweep
      with zero retired sessions.
- [x] Concurrent retained session clock failures are reported and rebased one
      per valid sweep; reporting the first never clears the rest.
- [x] A retained request clock failure arriving while an earlier session's
      cleanup is blocked is rechecked and rebased before that session can be
      retired from the sweep's stale eligibility snapshot.

### Request and teardown lifecycle

- [x] A real streaming MCP request is held behind a deterministic barrier; a
      sweep after TTL reaps zero sessions, release refreshes the idle epoch, and
      a later sweep reaps exactly one.
- [x] A valid existing-session POST is held while its body is still streaming;
      the same zero-reap assertion proves protection starts before body parsing.
- [x] Two concurrent requests produce a reference count of two, and releasing
      only one never makes the session eligible.
- [x] Removing the active-reference predicate makes the focused regression fail
      for the intended reason.
- [x] Explicit DELETE, transport close, transport error, idle expiry, and daemon
      shutdown all converge on the same termination operation.
- [x] Repeated/concurrent terminal signals close/unregister/remove at most once
      and all callers observe the same terminal outcome.
- [x] Shutdown overlapping an in-flight sweep reports each sweep-owned terminal
      cleanup failure exactly once.
- [x] A late old-session callback cannot delete a replacement map entry.
- [x] Unknown-session behavior is asserted by stable JSON-RPC/HTTP codes, not
      human-readable diagnostic wording.

### Construction and orphans

- [x] Forced failure at each construction boundary leaves no map entry or
      control-plane registration and closes/removes every resource already
      acquired.
- [x] A restart fixture leaves valid prior-process session directories behind,
      starts a new exclusive daemon owner, and proves they are removed before
      health/request admission opens.
- [x] Periodic discovery removes a current-owner directory absent from the map.
- [x] Live current-session directories are never selected as orphans.
- [x] Symlinks, files, malformed markers, path escapes, and unknown children are
      preserved and reported without touching their targets.
- [x] Replacing the sessions root after initial validation, during enumeration,
      or after candidate inspection refuses the scan before recursive removal.
- [x] Replacing the sessions root before live-session terminal cleanup refuses
      removal and preserves an external same-ID directory.
- [x] A temporary-claim release failure after root-owner publication rolls back
      the exact owner and claim residue; immediate reacquisition succeeds.
- [x] Custom-endpoint startup and sweeps preserve unmarked legacy UUID
      directories while still removing eligible marker-owned orphans.
- [x] Default-endpoint startup binds before legacy orphan cleanup and returns
      HTTP 503 until request admission opens.
- [x] A forced directory-removal failure reports one retired session, zero
      removed directories, and one retryable cleanup failure; a later sweep can
      remove the orphan.
- [x] A live session path replaced by a link or non-directory is refused as
      non-retryable and later reported as a preserved orphan entry.

### Public truth

- [x] `GraftDaemonServer.reapExpiredSessions()` is required and returns
      `SessionSweepResult`; no optional chaining can erase the contract.
- [x] `docs/MCP.md` describes monotonic inactivity, active-request protection,
      explicit close, crash-orphan cleanup, and failure reporting without
      claiming a nonexistent `GraftServer.close()` operation.
- [x] `CHANGELOG.md` records the user-visible lifecycle and configuration
      invariant once implementation matches this packet.

## RED / GREEN strategy

Behavioral RED tests are added one invariant at a time. Each test must fail on
the held implementation or under a documented mutation of the specific guard;
it must not assert this packet's wording or Markdown structure.

1. configuration-domain tests;
2. monotonic clock tests;
3. genuine streaming in-flight barrier;
4. pre-body-read activity barrier;
5. construction rollback failure points;
6. shared idempotent termination and truthful result;
7. startup and periodic orphan discovery with hostile-path fixtures; and
8. structured public error and documentation truth.

Focused daemon tests run after each issue. The relevant MCP unit/integration
suite, typecheck, lint, and isolated full suite run before the retro witness.

## Implementation boundary

The cycle owns:

- timing policy validation and the monotonic clock port;
- `DaemonSessionHost` activity/state/termination mechanics;
- transactional session construction;
- daemon-root/session-directory ownership and orphan scanning;
- typed sweep result and runtime event;
- focused lifecycle tests and existing playback preservation;
- MCP lifecycle documentation and changelog; and
- the required cycle retro and validation witness.

## Non-goals

- session persistence or restoration after daemon restart;
- keeping an in-flight request alive across process death;
- remote/TCP daemon transport;
- generic daemon cache eviction or WARP residency policy;
- deleting unknown files from the daemon root;
- a generic operator dashboard; or
- changing repo-local stdio session semantics.

## Playback questions

### Human

1. Can an operator state exactly when a session becomes idle and distinguish
   retired authority from successful scratch deletion?
2. After a hard daemon crash, does restart remove only session-owned residue
   before accepting work?
3. Does invalid configuration fail explicitly instead of producing no expiry,
   immediate expiry, or a timer hot loop?

### Agent

1. Can any request be reaped between session lookup and body/handler completion?
2. Can any terminal callback perform cleanup outside the shared idempotent
   transition?
3. Can a wall-clock step alter inactivity eligibility?
4. Can a failed session open leave a map entry, control-plane registration,
   transport, or undiscoverable directory?
5. Can cleanup follow a link, escape the sessions root, or call an unknown child
   an orphan?
6. Does every sweep distinguish retired sessions, removed directories, and
   retryable failures?

## What done means

The cycle is complete only when every acceptance criterion has executable
evidence, every current-head review thread is resolved, the local retro and
witness are committed, and current-head CI plus substantive third-party review
are green. A passing idle-expiry unit test alone is not completion.
