---
title: "Daemon session inactivity and orphan reaping"
cycle: "CORE_daemon-session-inactivity-reaping"
design_doc: "docs/design/CORE_daemon-session-inactivity-reaping.md"
source_pr: "https://github.com/flyingrobots/graft/pull/250"
outcome: hill-met
drift_check: manual
---

# Daemon session inactivity and orphan reaping Retro

## Outcome

PR #250 now implements one bounded daemon-session lifecycle instead of a timer
around a mutable map. Existing-session requests own exact activity references
from pre-body admission through settlement. Idle eligibility uses validated
process-local monotonic elapsed time. Explicit DELETE, transport close/error,
idle expiry, and daemon shutdown converge on one identity-checked terminal
operation that separately reports authority retirement, protocol/transport
closure, scratch removal, retryable cleanup debt, preserved entries, and clock
refusal.

Session construction is transactional across scratch creation, ownership-marker
publication, server/transport construction, protocol connection, control-plane
registration, and map publication. Failed opens unwind every acquired resource
and retain primary plus rollback failures. Open, pending, and terminating
session identities are reserved, preventing an ABA replacement from sharing
storage with cleanup still owned by an earlier session.

The daemon root is exclusively claimed before socket preparation or orphan
cleanup. Startup and every later sweep discover only direct, session-owned
children; unknown entries, files, links, unsafe roots, and malformed ownership
records are preserved and reported. Root ownership is published atomically and
includes a process-birth witness, so a recycled PID cannot impersonate the
recorded daemon.

## Playback

1. **When does a session become idle?** Only after its final active request
   settles and a validated monotonic sample begins a full configured TTL with
   `activeRequests == 0`.
2. **Can a streaming or partially uploaded request be reaped?** No. Real SSE
   and held-body barriers prove request ownership begins before the first body
   read and remains reference-counted until every request settles.
3. **What does a successful retirement mean?** Authority was revoked and the
   one terminal transition ran. Scratch removal is a separate result; a failed
   removal remains retryable orphan debt rather than being counted as deleted.
4. **What happens after a hard crash?** A successor first proves exclusive root
   authority, then removes only valid prior-process session directories before
   opening request admission. Periodic sweeps cover current-process residue.
5. **Can wall-clock corrections or invalid configuration alter eligibility?**
   No. Production uses `performance.now()`. Invalid TTLs, unsafe timer delays,
   and invalid/regressing clock samples fail explicitly without reaping.
6. **Can terminal causes race?** They can arrive concurrently, but the exact
   session object owns one shared promise. The regression gates idle cleanup,
   injects a real transport error, begins shutdown, and observes one unregister,
   one protocol close, and one directory removal.
7. **Did existing behavior survive?** Yes. Focused daemon lifecycle validation
   passes 53 tests. The exact-tree isolated-suite receipt is recorded in
   [verification.md](./witness/verification.md).

## Review Repair

The published implementation began at `5907cb4f`, gained a changelog entry at
`7dc90588`, and reached the held head `67c662ae`. That head's purported
in-flight regression started no in-flight request and asserted that the session
was reaped. Review correctly rejected the claim.

The repair first recorded the missing design contract at `1ba3f9dc`, then
closed the initial review queue and self-audit findings one invariant at a time:

- `53e09384`, `700535fe`, `52b4b720`, and `e2e718c8` established real streaming,
  pre-body, post-settlement, and exact concurrent-reference ownership.
- `31c91956`, `859832e5`, `3d59f302`, `62cbf598`, `240b8e0c`, and `36fc62fe`
  established timing-domain validation, monotonic elapsed time, structured
  refusal, and trusted rebase behavior.
- `6ea9af50`, `709a3377`, `cf25a79c`, `bd349bc7`, `0e43ec29` established
  transactional creation and complete rollback evidence at every acquisition
  boundary.
- `898b123a`, `0793c2eb`, `b2adf275`, `544e7e3b`, `c94af15e`, `acc39ecc`,
  `0e141ab8`, `6e741f54`, and `b5134bec` established one truthful terminal
  operation, transport-callback observability, shutdown fencing, identity
  reservation, transport-error coverage, ABA safety, and genuine idempotence.
- `4fdced68`, `1b073453`, `a71f665a`, `2554e4e1`, `9e135713`, `31027739`,
  `93bf5ee1`, `ee2a7182`, `a69bb208`, `f0399c6d`, `eedc99ec`, `93b0f9a8`, and
  `83b50a70` established exclusive and atomic root ownership, safe orphan
  discovery, scan/construction/shutdown serialization, hostile-path
  preservation, legacy endpoint protection, and process-birth identity.
- `e3c0f6c7`, `001f8ed8`, `61e7c341`, `6eebe77f`, `cb45bb1a`, `1af06bc3`, and
  `b39908ff` aligned stable public errors, required sweep typing, lifecycle
  documentation, signal failure handling, observable activity proof, adapter
  boundary admission, and exact default-value evidence.

Every originating inline thread repaired by these commits was resolved through
GraphQL. A final fully paginated refresh at `b5134bec` found two new Codex
threads matching the already queued construction-boundary and terminal-
idempotence findings; `0e43ec29` and `b5134bec` closed them. The Retro-policy
thread remained deliberately unresolved until this artifact and its exact-tree
verification existed.

The post-Retro exact-head Codex pass found one final documentation distinction:
transport-close termination deliberately skips protocol and fallback transport
closure because the transport is already closed, while idle, error, and
shutdown causes still own those operations. The repair adds a behavioral
assertion that transport close invokes no protocol close and updates `docs/MCP.md`
without testing prose.

The next exact-head pass found that displaced-owner restoration still exposed a
three-claimant ABA gap. The repair now holds a process-birth-checked filesystem
claim across owner publication, validation, quarantine, and restoration. Its
deterministic race test pauses the exact rename and proves a third publisher is
refused after the newer incumbent is restored.

The same pass found that a one-time legacy-endpoint probe could not authorize
later unmarked-directory deletion safely. The repair makes legacy cleanup an
explicit storage policy: custom endpoints always preserve unmarked legacy UUID
directories, while marker-owned orphan cleanup continues.

The final issue in that queue found that a valid sweep reported only the first
retained session clock failure while clearing every affected session. The
repair reports and rebases one session per sweep, leaving every other rejected
sample intact for its own later structured result.

The following exact-head pass found that sessions-root validation still existed
only at startup. Replacing the root with a symlink before a periodic sweep let
the scanner recursively delete an externally targeted owned-session fixture.
The repair moves the same unsafe-root refusal into the shared orphan-scan
boundary, before every enumeration.

The next exact-head review proved that a second pathname race remained inside
the scan: the root could change after that validation but before enumeration or
recursive removal. The repair now retains the original directory handle,
anchors its device/inode identity, and refuses any mismatch after enumeration
or immediately before candidate inspection and removal. Deterministic fixtures
swap the root in both windows and preserve the external target.

That review also found an owner-publication transaction gap: a temporary claim
release error could reject acquisition after `daemon-owner.json` was already
live, leaving no returned release handle. Claim release now remembers and can
resume cleanup of its exact released tombstone. Acquisition rolls back the
published owner before propagating the release error, retries claim cleanup,
and proves that immediate reacquisition succeeds.

That pass also found a default-endpoint check-to-scan race: a legacy daemon
could bind after socket preparation, create an unmarked live session, and lose
it to migration cleanup before the new daemon discovered `EADDRINUSE`. The
repair binds the endpoint first and serves only HTTP 503 until control-plane
initialization and orphan cleanup finish.

The same review found that an unsafe live-session path refusal claimed to be
retryable even though later orphan scans deliberately preserve links and
non-directories. The storage boundary now raises a typed unsafe-path refusal,
and termination reports that specific debt as non-retryable while preserving
ordinary retryable filesystem failures.

The final finding in this pass showed shutdown aggregating one cleanup failure
twice when an in-flight sweep owned the same termination promise also captured
by the termination registry. Shutdown now excludes sweep-owned promises from
its independent collector and receives their outcome only through the awaited
sweep result.

The closure refresh then exposed a CodeRabbit review-body note that two tests
still used human-readable diagnostics as their causal barrier or result. A
controlled mutation suppressing only those emissions produced one timeout and
one missing-diagnostic failure. The repaired tests remain green under that
mutation by waiting on scan completion, asserting single-flight execution, and
proving that failed transport cleanup becomes an orphan removed by the next
structured sweep.

The next exact-head review found that the pinned sessions-root boundary covered
orphan scans but not terminal cleanup of a live session. Replacing `sessions`
with a link immediately before DELETE redirected the stored session pathname
to an external same-ID directory. Live removal now derives and pins the direct
parent root, revalidates its device/inode identity before removal, and reports
root replacement as retryable cleanup debt.

The same review found that a valid sweep could block while terminating one
expired session, then retire a later session after that session recorded an
invalid request clock sample. The eligibility loop now rechecks retained clock
failure state immediately before every terminal transition, rebases one newly
failed session, and returns the partial retirement counts instead of using the
stale idle epoch.

The final exact-head review found that the generic-Unix process-birth fallback
used only `ps lstart`, whose finest field is seconds. The owner process now
installs a random 128-bit token in its stable process title. Generic-Unix
liveness hashes that token and the start value from one process snapshot, so a
rapidly recycled PID cannot inherit the old daemon's identity and the record
does not disclose process arguments.

The first regression test forced `process.platform` to Darwin and therefore
passed locally but sent Darwin `ps` flags to Alpine BusyBox in the canonical
container. The failed 258/259-file run kept the review thread open. The repair
extracted the digest derivation as a platform-neutral seam tested everywhere
and retained process-title installation as a real generic-Unix integration;
the following full isolated run passed all 259 files and 2,115 tests.

A later current-head CodeRabbit review found a remaining child-path race inside
live-session cleanup: the sessions root and child were validated, but recursive
removal still targeted the original pathname after an attacker could replace
that child with another real directory. Cleanup now moves the candidate to an
unpredictable quarantine name under the pinned root, compares that entry and an
open handle with the validated device/inode identity, and restores then refuses
any mismatch. The deterministic regression swaps in an external directory only
after the quarantine rename and proves both the replacement and original
contents survive.

The paired Codex review found that the live-cleanup result taxonomy still
classified that transient sessions-root refusal with permanently unsafe child
paths. A restored exact root makes its marker-owned directory discoverable on
the next sweep, so root-identity failures now remain retryable while symbolic
links and non-directory children remain non-retryable. The regression restores
the parked root and proves the next sweep removes the orphan.

The same CodeRabbit review carried one global-review finding with no inline
thread: claim-acquisition churn used immediate `continue` branches outside the
only deadline and delay check. The retry policy now lives at the loop boundary,
so every second and later attempt waits and checks the same deadline regardless
of why the prior attempt failed. The deterministic regression advances the
injected process clock after a stale claim disappears and proves reacquisition
is refused with the typed timeout.

A subsequent current-head Codex review found the orphan scanner still removed
the mutable UUID pathname after completing ownership-marker inspection. An
attacker could displace the eligible directory and install unrelated contents
at that name before recursive removal. Orphan cleanup now retains the inspected
device/inode identity, quarantines the current child under an unpredictable
sibling name, compares the moved entry with that identity, and restores then
refuses a mismatch. The deterministic regression performs the swap from the
marker-read observer and proves both the replacement and inspected contents
survive.

That Codex review also found the live-session path was first identified only
after terminal cleanup started. A real-directory replacement installed before
that point therefore became the cleanup function's own expected inode and was
deleted. The storage contract now requires a creation-time directory identity;
the session retains that witness through its lifetime, and both construction
rollback and terminal cleanup must present it before deletion. The end-to-end
RED displaced the initialized directory, installed unrelated marker-bearing
contents at the same UUID path, and observed `liveDirectoriesRemoved: 1` with
no failure. GREEN reports the typed non-retryable refusal and preserves both
directories byte-for-byte.

The remaining root-lifecycle finding showed that the same helper both created
the root at startup and pinned it during runtime. Renaming away the established
root immediately before expiry therefore made cleanup create a new empty root,
return `false`, and strand the marker-owned scratch under the parked path with
no diagnostic. Root creation now belongs only to explicit startup preparation;
runtime pins treat absence as `UNSAFE_DAEMON_SESSIONS_ROOT`. The integration RED
observed an empty failure list and a recreated root. GREEN reports both the
live-directory and orphan-scan failures, leaves the canonical path absent, and
preserves the parked bytes.

The final thread moved the root one await later: after the UUID child had already
been renamed to `.graft-removing-*`. The root assertion then threw outside every
restoration block, so restoring the parked root exposed only an unknown child
that later scans would preserve forever. Node does not provide descriptor-relative
rename operations here, and `/dev/fd/<fd>/child` returned `ENOENT` on the target
macOS runtime. The repair therefore uses the retained root device/inode to search
only the owned daemon root's direct children, identifies the exact parked root,
and restores the quarantine there before propagating the original refusal. The
RED observed only the quarantine name in the parked root; GREEN observes only
the original session UUID and its unchanged bytes.

## Drift

The largest drift was procedural: implementation and PR publication preceded
both the design packet and this Retro, directly violating the repository cycle.
The repair treated the published branch as held, wrote the missing contract,
and did not use the PR as a substitute for local closure. This is remediation,
not precedent.

Several first-pass test harnesses were discarded rather than laundered as
evidence:

- the original “in-flight” test asserted ordinary reaping without a request;
- an ESM `fs/promises.rm` spy could not represent the owned storage boundary;
- a close-event barrier raced ahead of request activity and was replaced with
  an observable transport/activity barrier;
- a fake `connect()` implementation bypassed the real MCP ownership transfer
  and was replaced with a gated call-through;
- an overlong socket path tested platform limits instead of the target error;
- an early scheduled-sweep sample observed before the diagnostic causal
  barrier and was corrected;
- `vi.waitFor` advanced fake civil time during a timestamp proof and was
  replaced with bounded event-loop polling at a frozen timestamp; and
- the first post-termination UUID-reuse attempt waited only for the DELETE HTTP
  response, not storage completion, and was corrected with an explicit cleanup
  barrier.

One audit-command incident also occurred: Markdown backticks passed through a
double-quoted shell comment body launched an unintended duplicate `pnpm test`.
The exact spawned processes were identified and stopped, its Docker container
was removed, the worktree remained clean, and no malformed GitHub comment was
posted. Every later GitHub body used an `apply_patch`-created literal body file.

Product scope did not drift into session persistence, remote transport, WARP
residency/eviction, generic daemon cache policy, or repo-local stdio semantics.
PR #251 owns the separate WARP residency problem and remains held independently.

## Findings

- Session retention, scratch ownership, daemon-root authority, and elapsed-time
  validation are one lifecycle model; repairing only the timer would leave the
  original memory claim false.
- A terminal operation needs two fences: shared promise ownership handles
  reentrant callbacks, while exact map identity protects later legitimate ID
  reuse. Neither string-key deletion nor callback-local cleanup is sufficient.
- Request protection must begin before any awaited parsing. Counting only the
  transport handler leaves slow uploads outside the ownership boundary.
- Monotonic samples are untrusted input when injected. A bad request-settlement
  sample must be retained and reported before later expiry can resume.
- Filesystem cleanup is authority-bearing. Direct-child classification,
  `lstat`, exact generated-UUID recognition, and exclusive root ownership are
  prerequisites to recursive deletion.
- Process liveness is not PID liveness. Root ownership requires an endpoint or
  an exact process-birth witness to survive PID reuse.
- Test names are claims. Mutation receipts were necessary to distinguish real
  lifecycle evidence from tests that happened to pass.

## Debt and Ideas

No new backlog card was filed from this cycle. Every in-scope lifecycle defect
found during Drift and exact-head review was repaired on PR #250. Generic WARP
working-set residency is explicitly outside this packet and remains the design
problem for held PR #251 rather than hidden debt in this Retro.
