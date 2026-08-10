---
title: "First retained workspace observation"
---

# First retained workspace observation

Source issue: [flyingrobots/graft#228](https://github.com/flyingrobots/graft/issues/228)
Parent goalpost: #232
Previous packet: [Admitted workspace snapshots for Graft analysis](./CORE_admitted-workspace-snapshots.md)
Legend: CORE

## Sponsors

- Human: James
- Agent: Codex

## Status

Design decision recorded. Implementation has not started.

The prior #228 cycle established the internal authority seam:
`RepoWorkspace` can analyze immutable admitted bytes through
`AdmittedWorkspaceReadView`, and its governed operations do not silently fall
back to a live filesystem when that view is present. Production composition
still supplies `LiveWorkspaceReadSource`. There is no Graft-owned Edict
declaration, production settlement decoder, retained request/settlement
composition, or restart replay path.

Requested-worktree authority is no longer a dependency in flight. Issue #238
landed through PR #244, so the requested root, canonical resolved root, and
workspace identity are available as the authority context for this cycle.

## Hill

A real `file_outline` call causes a Graft-owned Edict operation to authorize a
bounded workspace observation. Echo retains that request before the observer
reads the workspace and retains the schema-admitted settlement before Graft
reads the settled bytes. After process termination and recovery, the same
settlement produces byte-identical `file_outline` output with zero filesystem
reads and zero git-warp opens.

This cycle proves one complete causal round trip:

```text
Graft-owned ObserveWorkspaceSnapshot Edict source
  -> compiler-derived request admitted and retained by Echo
  -> authorized external observation
  -> schema-bound settlement admitted and retained by Echo
  -> production settlement decoder
  -> AdmittedWorkspaceReadView
  -> file_outline
  -> process termination and Echo recovery
  -> identical file_outline result with no external reread
```

## Decision: the request has an unknown workspace basis

The request authorizes an observation. The settlement witnesses its result.

Graft cannot truthfully provide the digest of dirty workspace bytes before the
authorized observer has read them. It therefore uses an **unknown-basis
request**, not a propose-and-admit protocol and not a verify-and-admit request
with a precomputed expected digest.

The request must express:

```text
workspaceBasisPosture: UNKNOWN
expectedWorkspaceBasisDigest: absent
```

`UNKNOWN` is a typed posture, not an all-zero digest, an empty byte string, a
digest of a sentinel word, or permission to omit basis semantics. Admission
must reject any request that claims both `UNKNOWN` and an expected workspace
basis digest.

The settlement must express the actual result:

```text
observedWorkspaceBasisDigest: <digest of canonical admitted path/byte set>
```

No component may read the workspace to manufacture a proposal before Echo
retains the request. That would make admission retrospective.

### Two bases must not be conflated

Echo's generic external-action request has an exact `basis_digest` that is
copied into its claim and settlement envelope. That field identifies the
causal request basis: the admitted program/worldline state from which the
request was derived. It remains known and exact.

The unknown value in this design is different: it is the digest of the
workspace bytes that the external action has not observed yet. It belongs in
the operation's typed input posture and, once known, in the schema-bound
settlement result.

```text
request.causalBasisDigest                 = known and exact
request.input.workspaceBasisPosture       = UNKNOWN
request.input.expectedWorkspaceBasis      = absent
settlement.envelope.basisDigest           = request.causalBasisDigest
settlement.result.observedWorkspaceBasis  = newly observed and exact
```

The existing bounded workspace observation example computes expected file
bytes before request admission and uses the resulting digest as Echo's generic
request basis. Its adapter then refuses any different observation as
`stale-basis`. That is a verify-and-admit protocol. The production vertical
cannot reuse that behavior unchanged.

If the Edict/Echo contract cannot express this separation, implementation
stops at that upstream contract boundary. It must not fabricate an expected
workspace digest or add a Graft-native executor to bypass Edict.

## Authority model

### Request authority

The request binds only facts Graft is entitled to know before observation:

- request identity derived from the admitted Edict operation;
- requested workspace identity;
- requested root;
- canonical resolved root from the already-authorized routing context;
- committed Git basis, when one exists, as contextual provenance rather than
  a claim about dirty workspace bytes;
- an ordered, repository-relative path aperture;
- maximum retained settlement bytes;
- symlink policy (`refuse` for this cycle);
- observation algorithm and version;
- policy, capability, schema, and reconciliation-law identities;
- workspace-basis posture `UNKNOWN`; and
- the known Echo causal basis.

The requested-worktree routing layer resolves and authorizes the workspace
before this operation is constructed. It must pass one immutable authority
context into the request path. The observer receives no ambient permission to
choose or rediscover another root.

The ordering proof instruments the external observation authority itself: the
request WAL commit must exist before the first metadata or content read made
through that authority. Request construction, Edict evaluation, and Echo
admission receive no workspace-read capability.

### Observer authority

One capability-rooted external adapter is the only component in this vertical
allowed to read workspace paths. It receives:

- the durable Echo claim for the exact request;
- the canonical resolved root capability;
- the requested aperture and budget; and
- the declared observation policy.

It may return evidence only for paths within the requested aperture. Relative
path normalization, root confinement, symlink refusal, file-type checks, and
budget enforcement happen before bytes become a successful settlement.

Opening the adapter is not settlement. Observed bytes remain untrusted until
the settlement schema, request correlation, authority bounds, evidence
digests, and canonical basis digest have all been admitted.

### Analysis authority

Only a successfully admitted and retained settlement can construct a
production `AdmittedWorkspaceReadView`. The production decoder is the sole
constructor at this boundary. `unsafeAdmittedWorkspaceSnapshotForTest` remains
test-only and is not imported by a production composition root.

`file_outline` receives the admitted read view, not the adapter and not a live
filesystem fallback. A rejected, failed, outcome-unknown, malformed, or
incomplete settlement never yields an analysis view.

## Canonical request contract

Names below describe required semantics; the generated Edict/Wesley artifact
is authoritative for final wire spelling.

```text
ObserveWorkspaceSnapshotRequest
  requestIdentity
  workspaceIdentity
  requestedRoot
  resolvedRoot
  committedGitBasis?            # contextual provenance only
  aperture[]                    # ordered, normalized relative paths
  byteBudget
  symlinkPolicy                 # REFUSE
  observationAlgorithm
  observationAlgorithmVersion
  policyIdentity
  capabilityIdentity
  causalBasisDigest
  workspaceBasisPosture         # UNKNOWN
```

The contract has no optional field whose absence ambiguously means “unknown,”
“not applicable,” or “forgotten.” The posture says `UNKNOWN`; the expected
workspace digest is structurally absent from this request variant.

For the first proof, Graft requests the one file needed by `file_outline`.
Directory discovery, broad indexing apertures, and implicit recursive walks
are outside this cycle.

## Canonical settlement contract

```text
ObserveWorkspaceSnapshotSettlement
  requestIdentity
  attemptIdentity
  observerIdentity
  observerVersion
  posture                       # SUCCEEDED | REJECTED | FAILED | OUTCOME_UNKNOWN
  requestedRoot
  resolvedRoot
  workspaceIdentity
  observedWorkspaceBasisDigest?
  admittedFiles[]
    path
    bytes | retainedContentReference
    byteLength
    contentDigest
  apertureConformance
  consistencyPosture
  obstruction?
    code
    detailDigest?
  schemaAdmissionEvidenceDigest
  externalEvidenceDigest
  settlementReceipt
```

A successful settlement contains an exact observed workspace basis and the
canonical path/byte evidence needed for replay. Its admitted paths are ordered,
unique, normalized, and a subset of the requested aperture. For this cycle's
one-file successful observation, the admitted set equals the requested set.

Typed terminal outcomes use Echo's external-action postures:

- `REJECTED` for a policy or coherence refusal established by the observer;
- `FAILED` when execution failure is established; and
- `OUTCOME_UNKNOWN` only when the adapter cannot establish what happened.

The result schema may carry a more specific obstruction code, but it must not
turn uncertainty or incoherence into a successful snapshot.

## Snapshot coherence

“Snapshot” means one coherent observation, not merely a list of bytes read in
sequence.

The observation algorithm must document and version how it detects mutation.
At minimum it must validate each admitted file against stable metadata and
content evidence before and after reading, and it must bind the final ordered
path/digest set into `observedWorkspaceBasisDigest`.

If the workspace changes during observation and the bounded algorithm cannot
establish a coherent result, it returns a typed `REJECTED` settlement with a
coherence obstruction. If the observer cannot establish whether an external
result was produced, it returns `OUTCOME_UNKNOWN`. It never calls a temporally
mixed set of files `SUCCEEDED`.

Retry policy is bounded and explicit. This cycle does not hide a retry loop
behind the adapter or silently widen the aperture to recover from mutation.

## Causal sequence

```mermaid
sequenceDiagram
    participant G as Graft file_outline
    participant D as Edict declaration
    participant E as Echo WAL
    participant O as Workspace observer
    participant V as Settlement decoder
    participant R as RepoWorkspace

    G->>D: Construct UNKNOWN-basis observation input
    D->>E: Admit and retain request
    E-->>O: Durable claim and bounded root capability
    O->>O: Read only the admitted aperture
    O->>E: Admit and retain schema-bound settlement
    E-->>V: Retained canonical result bytes and receipt
    V-->>R: AdmittedWorkspaceReadView
    R-->>G: file_outline result

    Note over G,E: Process terminates and reopens from Echo history
    G->>E: Recover admitted settlement
    E-->>V: Same retained result bytes and receipt
    V-->>R: Same AdmittedWorkspaceReadView
    R-->>G: Identical result; no observer or git-warp access
```

## Invariants

1. **Request before effect.** Echo's durable request commit precedes the first
   workspace metadata or content read through the observation authority.
2. **Claim before effect.** The adapter cannot observe without a durable claim
   correlated to the exact admitted request.
3. **Settlement before analysis.** Echo's durable settlement commit precedes
   the first `WorkspaceReadView` read performed by Graft analysis.
4. **Exact correlation.** Request, claim, attempt, adapter, settlement, schema,
   law, authority scope, and causal basis identities agree.
5. **Exact root authority.** Requested root, canonical resolved root, and
   workspace identity agree with the authorized routing context.
6. **Bounded aperture.** Every settled path is normalized, root-confined, and
   inside the request aperture; successful first-slice settlement covers the
   requested file exactly.
7. **Evidence-bound bytes.** File digests, ordered path set, external evidence,
   settlement result, and observed workspace basis validate together.
8. **Coherent success.** Mutation that prevents a coherent observation cannot
   produce a successful settlement.
9. **No authority laundering.** The decoder and read view cannot acquire a
   filesystem, process, Git, or git-warp capability.
10. **Replay is closed-world.** Restarted replay consumes only recovered Echo
    history and retained settlement content.
11. **Retries are explicit.** An exact duplicate settlement is idempotent; a
    conflicting settlement is obstructed and does not replace retained truth.
12. **No invented outcome.** Recovery of a requested or claimed action without
    a settlement remains pending or outcome-unknown according to the retained
    protocol state.

## Acceptance

### Contract and admission

- [ ] A Graft-owned `ObserveWorkspaceSnapshot` Edict source is checked in and
      compiled through the repository's pinned generation path.
- [ ] Generated artifacts declare an unknown workspace-basis request; no
      pre-observation workspace digest, sentinel digest, or proposal read is
      present.
- [ ] The request binds the authorized workspace identity, requested and
      resolved roots, ordered aperture, byte budget, symlink policy,
      algorithm/version, policy/lawpack identities, and known causal basis.
- [ ] Echo independently admits the exact compiler-derived request and retains
      it durably before granting observation authority.
- [ ] Any required Edict/Echo substrate change is versioned and tested at its
      owning boundary; Graft does not substitute a hand-authored executor.

### Observation and settlement

- [ ] The adapter can read only through the exact durable claim and
      capability-rooted resolved workspace.
- [ ] The first adapter metadata/content read occurs after the request WAL
      commit.
- [ ] Escaped, absolute, duplicate, symlinked, unauthorized, non-file, and
      over-budget observations produce typed non-success settlements.
- [ ] A successful settlement contains schema-admitted bytes or retained
      content references, per-file digests, and an exact observed workspace
      basis.
- [ ] A mutation race that prevents coherence produces a typed rejection or
      explicit outcome uncertainty, never a successful mixed snapshot.
- [ ] Echo retains the admitted settlement before Graft receives analysis
      authority.
- [ ] Exact duplicate settlement retry is idempotent and a conflicting retry
      is obstructed.

### Graft analysis and replay

- [ ] A production decoder validates settlement posture, correlation, roots,
      identity, aperture, budgets, evidence, and content before constructing
      `AdmittedWorkspaceReadView`.
- [ ] The production path for the proof cannot import
      `unsafeAdmittedWorkspaceSnapshotForTest` or construct
      `LiveWorkspaceReadSource` as a fallback.
- [ ] One existing governed operation, `file_outline`, completes against the
      retained admitted view.
- [ ] The process terminates, reopens from Echo history, and produces the
      identical structured `file_outline` result.
- [ ] Restarted replay performs zero filesystem reads and zero git-warp opens.
- [ ] Recovery after request or claim retention but before settlement does not
      invent success or reread without an explicit reconciliation decision.

### Required acceptance evidence

The executable proof must expose positions and counters, not infer ordering
from log prose:

```text
requestWalPosition < firstFilesystemReadPosition
settlementWalPosition < firstGraftAnalysisReadPosition
settlement.requestIdentity == request.requestIdentity
settlement.requestedRoot == request.requestedRoot
settlement.resolvedRoot == request.resolvedRoot
settlement.workspaceIdentity == request.workspaceIdentity
settlement.admittedAperture subsetOf request.aperture
liveFileOutlineResult == restartedFileOutlineResult
restartedFilesystemReads == 0
restartedGitWarpOpens == 0
```

The filesystem counter covers all metadata and content operations performed by
the external observation authority, not only calls named `readFile`.

## Test strategy

The RED proof uses real Edict-generated contracts and real Echo request, claim,
settlement, WAL, and recovery machinery. Test doubles may provide a bounded
workspace and instrument its authority, but they may not replace Echo with the
existing fake transport or call Graft analysis as a native callback from an
Edict executor.

1. A narrow integration fixture contains one source file whose `file_outline`
   result is stable and structured.
2. An observation-authority spy records every metadata/content operation and
   fails if no durable request commit is visible at the first operation.
3. An analysis-read spy fails if no durable settlement commit is visible at
   the first Graft read.
4. A restart test closes all live observer authority, reopens only Echo
   history, reconstructs the view, and compares structured results.
5. Decoder tests reject malformed correlation, substituted roots, widened
   apertures, wrong digests, over-budget bytes, non-success posture, and
   mutable/aliased retained content.
6. A mutation fixture forces the coherence algorithm to observe change and
   asserts a typed non-success settlement.
7. Recovery tests cover request-only and claimed-without-settlement states.
8. Retry tests prove exact-duplicate idempotence and conflicting-settlement
   obstruction.

Tests assert protocol state, structured results, receipts, positions, and
authority counters. They do not assert design-document wording or incidental
console text.

## Implementation boundary

The cycle owns only the pieces required to ring this bell:

1. Graft-owned Edict declaration and generated contract artifacts.
2. The minimum versioned Edict/Echo contract support for unknown workspace
   basis, if the pinned substrate cannot yet express it.
3. Production request/claim/settlement composition for one bounded read.
4. Production settlement decoding into `AdmittedWorkspaceReadView`.
5. `file_outline` live execution and restart replay proof.
6. Instrumented causal-order, filesystem-read, and git-warp-open evidence.

Implementation should remain one causal-invariant campaign. If an upstream
contract change needs its own repository PR, that dependency lands first; it
does not justify widening the Graft PR.

## Explicit non-goals

- broader `StructuralReadingPort` migration;
- history/blame migration or evidence-label changes;
- git-warp import or parity claims;
- live-frontier or speculative-work support;
- PR #233 salvage beyond its completed inventory/disposition;
- daemon dashboards or generic observability UI;
- generic Continuum redesign;
- mutation, patch application, or governed writes;
- recursive workspace discovery or whole-repository indexing;
- migration of Graft operations other than `file_outline`;
- a new filesystem-shaped production adapter beside the retained-settlement
  decoder;
- a hand-authored native application executor in place of Edict; and
- a temporary production fake transport.

## Playback questions

### Human playback

1. Can I identify the durable request record that existed before the first
   workspace read?
2. Does the request authorize observation without claiming a digest for bytes
   not yet observed?
3. Can I identify the durable settlement that existed before Graft analysis?
4. If the workspace changes during observation, do I get a typed non-success
   outcome rather than a mixed snapshot?
5. After restart, can I remove or deny the workspace and still obtain the same
   structured `file_outline` result?

### Agent playback

1. Which exact Edict source, Core artifact, Target IR artifact, schemas,
   lawpack, and adapter identity produced the request and settlement?
2. Do the request, claim, settlement, decoder evidence, and read-view evidence
   agree on request identity, roots, workspace identity, aperture, causal
   basis, and observed workspace basis?
3. Are the WAL positions and authority counters machine-asserted?
4. Can any production branch reach `LiveWorkspaceReadSource`, Git, git-warp,
   or `unsafeAdmittedWorkspaceSnapshotForTest` during replay?
5. Does recovery distinguish requested, claimed, settled-success,
   settled-non-success, and outcome-unknown states without inventing evidence?

## What “done” means

The cycle is done only when the complete vertical survives a real restart and
the replay proof closes the external world. A green decoder unit test, an
Edict artifact, a retained request without analysis, or a live run without
recovery is useful progress but is not this hill.

Only after this proof lands may the next cycle migrate one structural-history
surface behind `StructuralReadingPort` with explicit `echo-native`,
`git-warp-imported`, and `fallback-translated` evidence postures.
