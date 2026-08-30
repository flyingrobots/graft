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
settlement produces `file_outline` output equal to the live result under the
deny-by-default replay projection defined in *Required acceptance evidence*,
with zero filesystem reads, zero git-warp opens, zero direct Git operations,
and zero process executions.

"Byte-identical" is deliberately not the bar, and saying so here rather than
only in the acceptance list is the point: the live result carries `cacheHit`
and `actual` that a cold post-restart call cannot, and the MCP boundary stamps
per-call identity on every response. A hill that demands raw equality would be
unreachable for reasons that have nothing to do with whether retention works.

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
  -> file_outline result equal under replayProjection, with no external reread
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
- a caller-known observation key bound to the authenticated caller namespace;
- requested workspace identity;
- requested root;
- canonical resolved root from the already-authorized routing context;
- committed Git basis, when one exists, as contextual provenance rather than
  a claim about dirty workspace bytes;
- an ordered, repository-relative path aperture;
- maximum retained settlement bytes;
- symlink policy (`refuse` for this cycle);
- observation algorithm and version;
- retained-analysis projection policy and projection schema identity;
- policy, capability, schema, and reconciliation-law identities;
- workspace-basis posture `UNKNOWN`; and
- the known Echo causal basis.

The requested-worktree routing layer resolves and authorizes the workspace
before this operation is constructed. It must pass one immutable authority
context into the request path. The observer receives no ambient permission to
choose or rediscover another root.

For `RETAIN_COLORFUL_PROSE_V1`, `capabilityIdentity` also binds the exact
Colorful producer protocol admitted by the projection policy: the version probe
and stdin-fed IR invocation used by `createColorfulCliProseProjector`. It does
not authorize an ambient shell or arbitrary executable. The request's
projection schema identity fixes the output shape that may enter settlement;
the settlement's producer contract version and vocabulary hash must agree with
that policy.

The ordering proof instruments the external observation authority itself: the
request WAL commit must exist before the first metadata or content read made
through that authority. Request construction, Edict evaluation, and Echo
admission receive no workspace-read capability.

**Instrumenting that authority is necessary and not sufficient**, and this is
the sharpest trap in the cycle. Path resolution today calls
`fs.realpathSync.native` and `fs.lstatSync` (`src/adapters/repo-paths.ts`)
before `RepoWorkspace` exists, so those reads never pass through the spy. An
ordering assertion scoped to the authority would therefore read green against a
workspace that had already been touched — the evidence looks clean exactly when
it is wrong. Pre-request handling must be lexical, with realpath and symlink
resolution moved inside the claimed authority or removed.

**Counting is the detector, not the remedy.** `preRequestWorkspaceMetadataReads`
is required to be `0`, so instrumenting the existing pre-request reads and
leaving them in place cannot satisfy request-before-effect — it just makes the
violation visible and the evidence red. The counter exists so that a future
reintroduction fails loudly, not as a second way to pass.

### Observer authority

One capability-rooted external adapter is the only component in this vertical
allowed to read workspace paths. It receives:

- the durable Echo claim for the exact request;
- the canonical resolved root capability;
- the requested aperture and budget; and
- the declared observation and retained-analysis projection policies; and
- when that projection policy requires it, a process capability restricted to
  the exact Colorful producer protocol bound by `capabilityIdentity`.

It may return evidence only for paths within the requested aperture. Relative
path normalization, root confinement, symlink refusal, file-type checks, and
budget enforcement happen before bytes become a successful settlement.

Opening the adapter is not settlement. Observed bytes remain untrusted until
the settlement schema, request correlation, authority bounds, evidence
digests, and canonical basis digest have all been admitted.

The claimed observer may invoke the Colorful producer only after the durable
request and claim exist, only for an admitted Colorful-supported entry, and
only before settlement. A missing, mismatched, or failed producer yields a
typed non-success settlement; it never hands process authority to Graft
analysis or triggers a post-settlement live fallback.

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
  observationKey
  workspaceIdentity
  requestedRoot
  resolvedRoot
  committedGitBasis?            # contextual provenance only
  aperture[]                    # ordered, normalized relative paths
  byteBudget
  symlinkPolicy                 # REFUSE
  observationAlgorithm
  observationAlgorithmVersion
  analysisProjectionPolicy      # RETAIN_COLORFUL_PROSE_V1
  proseProjectionSchemaIdentity
  policyIdentity
  capabilityIdentity
  settlementSchemaIdentity
  reconciliationLawIdentity
  causalBasisDigest
  workspaceBasisPosture         # UNKNOWN
```

`settlementSchemaIdentity` and `reconciliationLawIdentity` are listed
explicitly because `policyIdentity` and `capabilityIdentity` identify neither
the generated settlement schema nor the retry/reconciliation semantics, and
invariant 4 requires those identities to agree through settlement. Without
them, an implementation cannot prove the correlation holds across a version
change — which is exactly when it matters. If the pinned compiler derives a
single identity that transitively binds both, that identity may replace these
two, but the binding must then be stated and verified rather than assumed.

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
  observationKey
  attemptIdentity
  observerIdentity
  observerVersion
  observationAlgorithm
  observationAlgorithmVersion
  analysisProjectionPolicy
  proseProjectionSchemaIdentity
  policyIdentity
  capabilityIdentity
  settlementSchemaIdentity
  reconciliationLawIdentity
  causalBasisDigest
  posture                       # SUCCEEDED | REJECTED | FAILED | OUTCOME_UNKNOWN
  requestedRoot
  resolvedRoot
  workspaceIdentity
  observedWorkspaceBasisDigest?
  admittedFiles[]
    path
    entryKind                   # REGULAR | SYMLINK -- schema-bound, see below
    bytes                       # inline only for this cycle; see below
    byteLength
    contentDigest
    analysisProjection
      posture                   # NOT_APPLICABLE | RETAINED_PROSE
      retainedProse?            # present iff posture == RETAINED_PROSE
        schemaIdentity          # graft.prose-projection/v1
        producerContractVersion # colorful.syntax/v1
        producerVocabularyHash
        sourceContentDigest     # must equal the containing file digest
        format                  # PROSE
        partial                 # false in v1
        syntaxSpans[]
        outline[]
        jumpTable[]
        projectionDigest
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

**Correlation identities are settlement data, not decoder configuration.** The
observation key, observer/attempt, observation algorithm, projection profile,
policy, capability, settlement schema, reconciliation law, and causal basis
fields are admitted into the retained settlement and compared with the durable
request and claim. A decoder cannot prove correlation by injecting the
identities it expected to see or by treating `requestIdentity` as a substitute
for fields the settlement never carried. Final generated wire spelling may
differ, but every semantic identity above must be recoverable and independently
validated.

**Prose analysis is retained settlement content, not replay authority.** The
request fixes `RETAIN_COLORFUL_PROSE_V1` and its schema identity before the
observer runs. For a Colorful-supported path, a successful settlement must
carry `RETAINED_PROSE`; `NOT_APPLICABLE` is valid only for a path outside that
profile. The retained payload is the complete `ProseProjection` product
surface (`format`, `partial`, `syntaxSpans`, `outline`, and `jumpTable`) from
`src/operations/colorful-prose-projection.ts`, not raw CLI output. It is bound
to the containing entry by `sourceContentDigest`, bound to the producer by the
Colorful contract version and vocabulary hash, and self-bound by
`projectionDigest`. The production decoder validates those bindings and the
projection schema before constructing a process-free retained projection
provider. Both the first post-settlement `file_outline` execution and restarted
replay receive that same provider; neither can call the Colorful CLI.

**`entryKind` is schema-bound, not inferred.** The read view's `SettledFile`
already carries `entryKind: "regular" | "symlink"` and enforces
`symlinkPolicy: "refuse"` against it (`src/operations/workspace-read-view.ts`).
Observer bytes are untrusted until admission, so if the entry kind is not in
the settlement schema the decoder has to trust the observer about the one fact
symlink policy turns on. It is therefore part of the canonical shape above, and
the decoder validates it before constructing the read view.

**Inline bytes only, this cycle.** An earlier draft allowed
`bytes | retainedContentReference`. That second branch is removed rather than
specified: the packet never said where a reference durably lives or which
authority resolves it after restart, so a one-file proof using inline bytes
could pass every counter while the other permitted production representation
depended on a workspace file, a transient CAS, or another external store —
violating invariant 10 while the evidence read clean. Content references are a
real need for larger apertures and are deferred to the cycle that can specify
their retention and digest verification. Narrowing the contract is the honest
way to close this; leaving both branches with only one tested is not.

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
    G->>E: Replay mode supplies retained observation key
    E-->>V: Same retained result bytes and receipt
    V-->>R: Same AdmittedWorkspaceReadView
    R-->>G: Equal under replayProjection; no observer or git-warp access
```

## Decision: a restarted call selects its settlement by an explicit replay key

The diagram above says "recover admitted settlement" as though one exists. Once
the same workspace and path have been observed more than once — the normal case
after any edit — a fresh `file_outline(path)` has several retained settlements
to choose from, and nothing above tells it which. A one-record fixture would
pass while production returned stale or nondeterministically selected bytes.

The replay path therefore resolves a **durable replay key**, not "the
settlement for this path". The key binds workspace identity, canonical resolved
root, the requested aperture entry, and the causal position being replayed, so
selection is a lookup rather than a search. After authenticating the caller
binding, recovery of an admitted key whose retained protocol state is requested
or claimed is `pending` or `outcome-unknown` per invariant 12. A malformed,
unknown, or unauthorized key is the same structured refusal without revealing
whether another caller owns it. Neither case falls back to the newest record,
because "newest" is exactly the nondeterminism this decision exists to remove.

Choosing the concrete key shape is implementation work for this cycle. What the
packet fixes is that the choice must be explicit, deterministic, and proven
against **more than one settlement for the same aperture** — a single-record
fixture cannot distinguish a correct rule from no rule at all.

### Replay entry is receipt-addressed, not workspace-routed

The current MCP input is `{ path, cwd? }`, and daemon dispatch resolves an
explicit `cwd` through `WorkspaceRouter` before the tool handler runs
(`src/mcp/server-invocation.ts`). That live route performs exactly the Git and
filesystem prerequisites enumerated above. Reusing it after restart would make
the zero-I/O replay claim false before Echo recovery began.

This cycle therefore changes `file_outline` input to a discriminated union:

```text
FileOutlineInvocation
  LIVE
    observationKey
    path
    cwd?
  REPLAY
    observationKey
```

`observationKey` is a canonically encoded token with at least 128 bits of
caller-generated entropy that the authenticated caller knows before the live
invocation. Request admission binds it to that caller namespace and the exact
request identity, aperture, and causal basis before granting the claim. Exact
reuse is idempotent; reuse for another caller or request shape is obstructed.
The token is not bearer authority and is never trusted as a caller-asserted
identity. A successful live result echoes the admitted key, and settlement
extends its retained binding to the receipt and causal position.

Requiring the key is an intentional input-contract change: silently generating
it server-side would make request-only and claim-only crashes unrecoverable
because no response delivered the value. The implementation versions the MCP
input schema, updates in-repository callers, and records the public change in
`CHANGELOG.md`; it does not retain a legacy no-key production branch.

`REPLAY` is recognized before workspace authorization or execution-context
planning. It accepts neither `cwd` nor `path`; both come from the retained
request/settlement selected by the caller-known key. The recovery composition
validates the authenticated caller binding and reconstructs the authority
context only from Echo history. A malformed, unknown, or cross-caller key is a
typed refusal. A known key whose protocol state is requested or claimed yields
the corresponding recovery-state result. No case falls back to
`WorkspaceRouter`, Git, `.graftignore`, a path resolver, or live observation.

## Invariants

1. **Request before effect.** Echo's durable request commit precedes every
   workspace metadata or content read and retained-projection process execution
   **causally initiated for this observation**, whatever component performs it
   — not only effects made through the observation authority.

   Both narrower and broader scopings are wrong, and the cycle needs the middle
   one. *Authority-scoped* is a loophole: `repo-paths.ts` calls
   `realpathSync.native` and `lstatSync` outside the authority, so an
   implementation could satisfy the invariant while making exactly the ambient
   pre-request read it exists to forbid. *Any read by any component* is
   unsatisfiable: routing first resolves canonical Git identity, then loads
   `.graftignore` and constructs the path resolver before an operation exists
   at all (`src/mcp/workspace-router-resolution.ts` and
   `src/mcp/workspace-router-runtime.ts`), so the first such read has always
   happened before any request could.

   The line is causal, not positional. Reads that establish the prerequisite
   routing and policy context are outside this ordering claim; every read taken
   *because of* this observation is inside it, including resolver reads
   performed on the requested path. The cycle must enumerate the prerequisite
   reads it is exempting and bound them, so the exemption cannot become a
   laundering channel — an unbounded "prerequisite" is the same loophole with a
   better name. No projection-process probe is prerequisite routing: even a
   `colorful --version` call belongs after the durable request and claim.
2. **Claim before effect.** The adapter cannot observe without a durable claim
   correlated to the exact admitted request.
3. **Settlement is the terminal authority boundary.** The last workspace read
   and retained-projection process execution precede Echo's durable settlement
   commit, which in turn precedes the first `WorkspaceReadView` read performed
   by Graft analysis. No observer capability survives settlement.
4. **Exact correlation.** Request, claim, attempt, adapter, settlement, schema,
   law, observation key, authority scope, and causal basis identities agree.
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
    history and retained settlement content, and executes no external process
    — including the prose projector, which is process-backed in production.
11. **Retries are explicit.** An exact duplicate settlement is idempotent; a
    conflicting settlement is obstructed and does not replace retained truth.
12. **No invented outcome.** Recovery of a requested or claimed action without
    a settlement remains pending or outcome-unknown according to the retained
    protocol state.
13. **Policy precedes retention.** A path the policy denies is refused before
    observation authority is granted, so denied bytes never reach a request
    aperture, a settlement, or Echo. Retention makes ordering that was
    previously cosmetic load-bearing.
14. **Selection is deterministic.** A restarted call recovers its settlement by
    an explicit replay key, never by recency or by scanning for a path match.
15. **Admitted bytes carry their kind.** Every settled entry records the
    observed file kind, so symlink policy is enforced against schema-bound
    evidence rather than trust in the observer.

## Acceptance

### Contract and admission

- [ ] A Graft-owned `ObserveWorkspaceSnapshot` Edict source is checked in and
      compiled through the repository's pinned generation path.
- [ ] Generated artifacts declare an unknown workspace-basis request; no
      pre-observation workspace digest, sentinel digest, or proposal read is
      present.
- [ ] The request binds the authorized workspace identity, requested and
      caller-known observation key, requested and resolved roots, ordered
      aperture, byte budget, symlink policy,
      algorithm/version, `analysisProjectionPolicy`,
      `proseProjectionSchemaIdentity`, `policyIdentity`, `capabilityIdentity`,
      `settlementSchemaIdentity`, `reconciliationLawIdentity`, and the known
      causal basis.
- [ ] Echo independently admits the exact compiler-derived request and retains
      it durably before granting observation authority.
- [ ] Any required Edict/Echo substrate change is versioned and tested at its
      owning boundary; Graft does not substitute a hand-authored executor.

### Observation and settlement

- [ ] The adapter can read only through the exact durable claim and
      capability-rooted resolved workspace, and can invoke only the exact
      projection producer protocol bound by that claim.
- [ ] The first adapter metadata/content read and first projection-process
      execution both occur after the request WAL commit and durable claim.
- [ ] Escaped, absolute, duplicate, symlinked, unauthorized, non-file, and
      over-budget observations produce typed non-success settlements.
- [ ] **Path-only policy is evaluated before observation authority is granted.**
      A path denied by `.graftignore` or the banned-path policy is refused
      before any adapter metadata or content read, so its bytes never enter a
      request aperture, a settlement, or Echo retention. Today
      `RepoWorkspace.fileOutline` observes first and calls `evaluateRefusal`
      afterwards (`src/operations/repo-workspace.ts`), which is harmless while
      observation is a live read and is **not** harmless once observation
      retains bytes durably. Splitting refusal into a path-only gate that runs
      before observation, with the existing content-dependent refusals staying
      where they are, is in scope for this cycle.
- [ ] **A path-only refusal variant exists that requires no observation.**
      `RepoWorkspaceRefusedResult` currently requires
      `actual: { lines, bytes }`, and `evaluateRefusal` sources those from the
      observed file (`src/operations/repo-workspace.ts`). A gate that refuses
      *before* observation therefore cannot populate them — leaving only three
      bad options: read the denied file anyway, fabricate the sizes, or change
      the public shape silently. The cycle adds an explicit refusal variant
      with no `actual` field, updates the output contract, and asserts that no
      fabricated observation metadata is ever returned for a denied path.
- [ ] Acceptance evidence shows denied content is never retained: for a denied
      path, `deniedPathRetainedSettlements == 0` and no Echo record contains
      its bytes or digest.
- [ ] **Pre-request path handling is lexical.** Today the MCP flow resolves the
      requested path in `file-outline.ts` before `RepoWorkspace` is
      constructed, and `RepoWorkspace.fileOutline` resolves it again; the
      resolver performs `fs.realpathSync.native` and `fs.lstatSync`
      (`src/adapters/repo-paths.ts`). Those are ambient workspace metadata
      reads that happen **before** the request exists and bypass the injected
      observation-authority spy — so both the request-ordering assertion and
      the restarted zero-read counter can pass while the workspace was already
      touched. Pre-request handling must be lexical only; realpath and symlink
      resolution move inside the claimed observation authority or are removed.
      Instrumenting them and leaving them in place is **not** an alternative:
      `preRequestWorkspaceMetadataReads` is required to be `0`, so counting a
      surviving pre-request read reports the violation rather than satisfying
      the criterion.
- [ ] **The prerequisite-read exemption is enumerated and bounded.** Invariant 1
      orders reads causally initiated for this observation, so the routing and
      policy reads that establish the authority context sit outside the claim.
      The closed exemption is: exactly two `GitClient` `rev-parse` calls for
      worktree and common-Git roots; `realpathSync` of those two roots plus one
      per supplied `worktreeRoot` or `gitCommonDir` identity hint; one injected
      filesystem read attempt for `.graftignore`; and one worktree-root
      `realpathSync.native` while constructing the path resolver
      (`src/mcp/workspace-router-resolution.ts` and
      `src/mcp/workspace-router-runtime.ts`). The implementation may remove an
      exempted read but may not add a category without changing this contract,
      and the test asserts that no read is left unclassified. An unenumerated
      "prerequisite" category would let any read be reclassified out of the
      invariant, which is the authority-scoped loophole wearing a different
      name.
- [ ] **Each admitted entry carries its observed file kind.** The read view's
      `SettledFile` already requires `entryKind: "regular" | "symlink"` and
      enforces `symlinkPolicy: "refuse"` against it
      (`src/operations/workspace-read-view.ts`), but the settlement record
      defined here has no such field. Observer bytes are untrusted until
      admission, so without a schema-bound entry kind a buggy or hostile
      observer can settle bytes reached through a symlink and the decoder has
      no fact with which to refuse them. The kind is admitted per entry and
      validated before the read view is constructed.
- [ ] A successful settlement contains schema-admitted **inline** bytes,
      per-file digests, per-entry kind, the discriminated retained-analysis
      projection for every entry, and an exact observed workspace basis. A
      Colorful-supported entry requires the complete digest- and
      producer-bound `RETAINED_PROSE` payload; another path requires the
      explicit `NOT_APPLICABLE` posture. Retained content references are out of
      scope for this cycle — see the canonical settlement contract for why the
      branch was removed rather than left permitted-but-untested.
- [ ] A mutation race that prevents coherence produces a typed rejection or
      explicit outcome uncertainty, never a successful mixed snapshot.
- [ ] Every adapter metadata/content read and projection-process execution
      finishes before the settlement WAL commit; no observer capability can be
      invoked after settlement.
- [ ] Echo retains the admitted settlement before Graft receives analysis
      authority.
- [ ] Exact duplicate settlement retry is idempotent and a conflicting retry
      is obstructed.

### Graft analysis and replay

- [ ] A production decoder validates settlement posture, correlation, roots,
      identity, aperture, budgets, evidence, content, and retained-analysis
      projection posture/bindings before constructing
      `AdmittedWorkspaceReadView` or the retained prose provider.
- [ ] The production path for the proof cannot import
      `unsafeAdmittedWorkspaceSnapshotForTest` or construct
      `LiveWorkspaceReadSource` as a fallback.
- [ ] One existing governed operation, `file_outline`, completes against the
      retained admitted view.
- [ ] `file_outline` exposes the discriminated `LIVE`/`REPLAY` input above. A
      live invocation requires a caller-known `observationKey` and successful
      output echoes it, while replay requires the same key, rejects `cwd`/`path`,
      and dispatches before workspace routing. No no-key production branch
      remains after the versioned input migration.
- [ ] Request admission validates canonical encoding and at least 128 bits of
      caller-generated entropy, then binds `observationKey` to the authenticated
      caller namespace, request identity, aperture, and causal basis. Settlement
      extends that binding to its receipt and causal position. Exact retry is
      idempotent; malformed, unknown, cross-caller, conflicting, and
      aperture-substitution keys are typed refusals, not lookup misses.
- [ ] The process terminates, reopens from Echo history, and produces a
      `file_outline` result identical to the live one **under the comparison
      projection defined below**. Raw structural equality is the wrong bar and
      would fail for reasons unrelated to retention: the cache-hit path returns
      `cacheHit: true` and `actual`, which the cold post-restart path omits
      (`src/operations/repo-workspace.ts`), and the MCP boundary adds a fresh
      timestamp, trace, sequence, latency, and cumulative receipt on every call.
- [ ] **Replay composition carries no process authority.** Production
      `file_outline` receives `createColorfulCliProseProjector`, whose
      projection shells out to `colorful --version` and `colorful ir -` through
      `processRunner.run` (`src/adapters/colorful-cli-prose-projector.ts`). A
      replay that still holds that projector is not closed-world: a missing or
      upgraded binary changes the result from identical retained bytes.
- [ ] **Removing process authority may not change the answer.** The resolution
      above is *not* "drop the projector during replay only". For a
      Colorful-supported input such as `.txt`, the observer runs the versioned
      Colorful producer before settlement and retains the schema-admitted prose
      projection described by the canonical contract. The production decoder
      validates its source digest, producer identities, schema identity, and
      projection digest, then supplies a process-free retained projection
      provider to **both** the first post-settlement execution and replay.
      Neither analysis path may receive `createColorfulCliProseProjector` or
      silently fall back to `UNSUPPORTED_LANGUAGE`.
- [ ] The proof covers a **Colorful-supported prose input**, not only a
      TypeScript fixture. A TS-only fixture satisfies the zero-process counter
      without ever exercising the branch this criterion exists to constrain,
      which would make the counter look green and prove nothing.
- [ ] Restarted replay performs zero filesystem reads, zero git-warp opens,
      zero process executions, and zero direct Git operations. The last is
      separate on purpose: a direct `GitClient` call increments neither the
      filesystem-observer counter nor `restartedGitWarpOpens`, so without its
      own counter this evidence can pass while invariant 9 is violated.
- [ ] Recovery after request or claim retention but before settlement does not
      invent success or reread without an explicit reconciliation decision.
- [ ] **The replay key selects deterministically among several settlements.**
      The proof retains more than one successful settlement for the same
      workspace and aperture and shows the restarted call recovers the intended
      one every time. A single-settlement fixture is not accepted as evidence:
      it cannot distinguish a correct selection rule from no rule at all.
- [ ] An authenticated, admitted observation key in requested or claimed state
      yields `pending` or `outcome-unknown`, never a fallback to the most recent
      record. Malformed, unknown, and unauthorized keys produce one
      indistinguishable structured refusal and disclose no retained state.
- [ ] **A recovery-state result exists at the product boundary.** Neither
      `FileOutlineResult` nor the MCP `file_outline` output union has a
      `pending` or `outcome-unknown` variant today — the available shapes are
      an outline or a refusal reason such as `NOT_FOUND`. Without a new
      variant, the required crash-recovery scenario has no valid structured
      response and would be misreported as an ordinary refusal or a transport
      failure, which is precisely the "invented outcome" invariant 12 forbids.
      The cycle adds an explicit recovery-state result to both the operation
      and MCP contracts, and covers **both** the request-only and claimed-only
      states.

### Required acceptance evidence

The executable proof must expose positions and counters, not infer ordering
from log prose:

```text
requestWalPosition < claimWalPosition
requestWalPosition < firstFilesystemReadPosition
requestWalPosition < firstProjectionProcessExecutionPosition
claimWalPosition < firstFilesystemReadPosition
claimWalPosition < firstProjectionProcessExecutionPosition
lastFilesystemReadPosition < settlementWalPosition
lastProjectionProcessExecutionPosition < settlementWalPosition
settlementWalPosition < firstGraftAnalysisReadPosition
claim.requestIdentity == request.requestIdentity
claim.observationKey == request.observationKey
claim.causalBasisDigest == request.causalBasisDigest
claim.capabilityIdentity == request.capabilityIdentity
request.observationKey == liveInvocation.observationKey
settlement.attemptIdentity == claim.attemptIdentity
settlement.observerIdentity == claim.adapterIdentity
settlement.observerVersion == claim.adapterVersion
settlement.requestIdentity == request.requestIdentity
settlement.observationKey == request.observationKey
settlement.observationAlgorithm == request.observationAlgorithm
settlement.observationAlgorithmVersion == request.observationAlgorithmVersion
settlement.analysisProjectionPolicy == request.analysisProjectionPolicy
settlement.proseProjectionSchemaIdentity == request.proseProjectionSchemaIdentity
settlement.policyIdentity == request.policyIdentity
settlement.capabilityIdentity == request.capabilityIdentity
settlement.settlementSchemaIdentity == request.settlementSchemaIdentity
settlement.reconciliationLawIdentity == request.reconciliationLawIdentity
settlement.causalBasisDigest == request.causalBasisDigest
settlement.requestedRoot == request.requestedRoot
settlement.resolvedRoot == request.resolvedRoot
settlement.workspaceIdentity == request.workspaceIdentity
settlement.admittedAperture subsetOf request.aperture
replayProjection(liveFileOutlineResult) == replayProjection(restartedFileOutlineResult)
replayInvocation.observationKey == request.observationKey
liveFileOutlineResult.observationKey == request.observationKey
restartedFileOutlineResult.observationKey == request.observationKey
restartedFilesystemReads == 0
restartedGitWarpOpens == 0
restartedProcessExecutions == 0
restartedDirectGitOperations == 0
restartedWorkspaceRouteResolutions == 0
preRequestWorkspaceMetadataReads == 0
deniedPathRetainedSettlements == 0
```

The filesystem counter covers all metadata and content operations performed by
the external observation authority, not only calls named `readFile`.

`claimWalPosition` is the durable WAL position of the exact claim handed to the
observer. Its ordering and correlation assertions are the executable evidence
for claim-before-effect; possession of an in-memory claim object is not a
durability proof. `adapterIdentity`/`adapterVersion` above name the claim-side
semantics corresponding to the settlement's observer identity/version; the
generated Echo contract controls their final wire spelling.

`firstProjectionProcessExecutionPosition` covers every `processRunner.run`
invocation used to produce retained analysis, including the Colorful version
probe. The replay process counter covers every `processRunner.run` invocation
reachable from the replayed call, including prose projection.

The two last-effect positions make settlement terminal rather than merely
early. The observation fixture includes a Colorful-supported entry, so both
positions exist; any filesystem or projection-process invocation after the
settlement commit fails the proof immediately.

The direct-Git counter covers `GitClient` operations that do not pass through
git-warp, including any invoked while reconstructing a causal basis. Without
it, invariant 9 has no evidence: the two existing counters both miss that path.

`restartedWorkspaceRouteResolutions` counts calls that authorize or construct a
live workspace execution context. It must remain zero because a replay routed
through `cwd` could perform prerequisite filesystem/Git reads before the other
replay counters were installed and would make Echo recovery depend on a live
worktree.

`preRequestWorkspaceMetadataReads` counts `lstat`, `realpath`, and equivalent
metadata calls made before the request is retained **and causally initiated for
this observation** — principally resolution of the requested path. It does not
count the prerequisite routing and policy reads that establish the authority
context before any operation exists; only the exact Git identity, root
canonicalization, `.graftignore`, and resolver-construction reads enumerated in
the acceptance criteria are exempt under invariant 1.

Enumerating the exemption is what keeps the counter honest. A count that
silently ignored "setup" reads would be zero by definition, which is the
vacuous-evidence failure this packet is built to avoid.

### The replay comparison projection

`replayProjection` is the stable semantic boundary the equality above is
asserted at. It must be defined over **every variant of the current result
union**, not only the success shape. `FileOutlineResult`
(`src/operations/file-outline.ts`) is today:

```ts
path, outline, jumpTable,
partial?, cacheHit?, actual?,
reason?: "UNSUPPORTED_LANGUAGE" | "INVALID_UTF8" | "UNADMITTED_PATH" | "NOT_FOUND",
error?
```

and the MCP refusal variant additionally carries `projection`, `reasonDetail`,
and `next` (`src/mcp/tools/file-outline.ts`).

- **kept — semantic, determined by retained evidence:** `path`, `outline`,
  `jumpTable`, `partial`, `reason`, `error`, `observationKey`, and the refusal
  fields
  `projection`, `reasonDetail`, `next`. `partial` in particular is a fact about
  the answer; dropping it would let a truncated replay compare equal to a
  complete live result.
- **dropped — how *this* process reached the answer:** `cacheHit` and `actual`,
  which are structurally absent on a cold cache.
**The comparison is made on the decoded operation payload, before the MCP
wrapper is attached.** Not at the MCP boundary. Every response carries
`_schema` and `_receipt`, and routed responses can also carry `_workspace` and
`tripwire` (`attachMcpSchemaMeta`/`buildReceiptResult` in `src/mcp/receipt.ts`,
schemas in `src/contracts/output-schemas.ts`). Enumerating that wrapper here
was tried and is the wrong shape: a hand-maintained list in a document cannot
be type-checked, and a deny-by-default rule over a stale list rejects every
valid response. Comparing before attachment removes the wrapper from the
question entirely, so per-call identity never enters the comparison and no list
has to be kept current.

This is a correction of my own two previous drafts, recorded rather than
quietly patched: the first under-enumerated the operation result union, and the
second repeated the identical mistake one layer up at the MCP wrapper. Twice is
a pattern, and the pattern says a deny-by-default projection specified as prose
over an evolving type surface will keep generating defects. Hence the rule
below.

The projection is defined once and applied to both sides, and it is
**deny-by-default**: a field in neither list fails the comparison rather than
being dropped silently. A projection that quietly discards new fields would
turn this assertion into a tautology the first time the result shape grows,
which is the failure mode that makes an assertion look alive while proving
nothing.

Deny-by-default and an under-specified field list are a trap together, and two
successive drafts of this section walked into it — first at the operation
result union, then again at the MCP wrapper.

**So the enumeration lives in code, not in this document.** The field list
above is the intent; the authoritative projection is defined once in the
implementation, and a test asserts it is total over the **whole operation
result union** by construction, so adding a field or a variant fails that test
until the projection is updated deliberately.

The union is `RepoWorkspaceFileOutlineResult = FileOutlineResult |
RepoWorkspaceRefusedResult` (`src/operations/repo-workspace.ts`), and item 7 of
the implementation boundary adds two more variants to it — the path-only
refusal and the recovery state. Totality over `FileOutlineResult` alone would
leave every refusal shape unprojected, which is the same under-enumeration
defect one level out: the deny-by-default rule would then drop or reject
semantic fields on exactly the results this cycle adds, while the replay proof
still reported green. A list maintained by prose is checked by
whoever remembers to look; a list maintained by the compiler is checked every
build. Requiring deny-by-default without that machinery is how both earlier
drafts produced a rule that would have rejected valid results.

## Test strategy

The RED proof uses real Edict-generated contracts and real Echo request, claim,
settlement, WAL, and recovery machinery. Test doubles may provide a bounded
workspace and instrument its authority, but they may not replace Echo with the
existing fake transport or call Graft analysis as a native callback from an
Edict executor.

1. A narrow integration fixture contains one source file whose `file_outline`
   result is stable and structured, **and** one Colorful-supported prose input.
   The second is not optional: a code-only fixture satisfies the zero-process
   counter without ever exercising the projector branch that counter exists to
   constrain.
2. An observation-authority spy records every metadata/content operation and
   fails unless the exact durable request and correlated claim commits are both
   visible at the first operation.
   **This spy alone cannot prove invariant 1**, which orders reads by *any*
   component: a read made outside the authority — `repo-paths.ts` resolving a
   path before `RepoWorkspace` exists — is invisible to it, so the spy reports
   green on an already-touched workspace. The proof therefore also instruments
   the filesystem at a level the resolver cannot bypass and asserts
   `preRequestWorkspaceMetadataReads == 0`. An authority-scoped spy is a
   necessary component of the evidence, never the whole of it.
   The same fixture injects the projection process capability, rejects any
   invocation outside the policy-bound Colorful protocol, and records its first
   position so an eager version probe before request/claim retention fails. It
   asserts the claim's request identity and causal basis against the request,
   rather than treating any retained claim as sufficient authority. The spy
   also records both last-effect positions and fails on any invocation after
   settlement.
3. An analysis-read spy fails if no durable settlement commit is visible at
   the first Graft read.
4. A restart test closes the observer and `WorkspaceRouter`, reopens only Echo
   history, invokes `file_outline` in `REPLAY` mode with the key returned by the
   live call, reconstructs the view, and compares results under
   `replayProjection` — not by raw structural equality, which cannot hold. It
   fails if workspace authorization or execution-context planning is entered.
5. Decoder tests reject malformed correlation, substituted roots, widened
   apertures, wrong digests, over-budget bytes, non-success posture,
   substituted observation keys, attempt/observer, algorithm, policy,
   capability, schema, law or causal-basis identities,
   missing/contradictory projection discriminants, wrong projection source,
   schema, producer or payload digests, and mutable/aliased retained content.
6. A mutation fixture forces the coherence algorithm to observe change and
   asserts a typed non-success settlement.
7. Recovery tests cover request-only and claimed-without-settlement states.
8. Retry tests prove exact-duplicate idempotence and conflicting-settlement
   obstruction.
9. A denied-path test drives a `.graftignore` or banned path and asserts the
   path-only refusal shape, that no observation occurred, and that Echo
   retained nothing for it (invariant 13). It must fail if the refusal carries
   fabricated `actual` sizes.
10. A multi-settlement test retains more than one successful settlement for the
    same workspace and aperture and asserts the replay key recovers the
    intended one every time (invariant 14). A single-settlement fixture cannot
    distinguish a correct selection rule from no rule and is not accepted.
11. An entry-kind test settles a symlink-reached path and asserts the decoder
    refuses it on schema-bound evidence rather than on observer cooperation
    (invariant 15).
12. Observation-key tests start from a caller-known key, prove it was admitted
    before the claim, reject malformed, unknown, cross-caller, conflicting, and
    aperture-substitution uses, reject `cwd` or `path` in replay mode, and
    return requested/claimed recovery state without live-routing fallback after
    a crash that delivered no live response.

Tests assert protocol state, structured results, receipts, positions, and
authority counters. They do not assert design-document wording or incidental
console text.

## Implementation boundary

The cycle owns only the pieces required to ring this bell:

1. Graft-owned Edict declaration and generated contract artifacts.
2. The minimum versioned Edict/Echo contract support for unknown workspace
   basis, if the pinned substrate cannot yet express it.
3. Production request/claim/settlement composition for one bounded read.
4. Production settlement decoding into `AdmittedWorkspaceReadView` plus a
   process-free retained prose projection provider. The decoder validates the
   per-file projection posture, source-content binding, projection schema,
   Colorful producer contract/vocabulary identities, and projection digest;
   both live post-settlement analysis and replay consume this provider rather
   than `createColorfulCliProseProjector`.
5. `file_outline` live execution and restart replay proof, including the
   `replayProjection` definition and the test asserting it is total over the
   whole `RepoWorkspaceFileOutlineResult` union — success, refusal, and the two
   variants item 7 adds — not over `FileOutlineResult` alone.
6. Instrumented causal-order evidence and every counter the acceptance list
   requires: request, claim, settlement, first/last-read, first/last-process,
   and first-analysis positions; filesystem reads, git-warp opens, direct Git
   operations, process executions, workspace-route resolutions, pre-request
   workspace metadata reads, and denied-path retention. Listing them here
   rather than "and so on" is deliberate — an acceptance criterion whose
   instrumentation is outside the implementation boundary cannot be met by the
   cycle that owns it.
7. The contract additions the acceptance list depends on: `entryKind` and the
   discriminated retained-analysis projection per admitted entry;
   `settlementSchemaIdentity`, `reconciliationLawIdentity`,
   `analysisProjectionPolicy`, and `proseProjectionSchemaIdentity` on the
   request; the corresponding observation algorithm/version, projection,
   policy, capability, settlement-schema, reconciliation-law, and causal-basis
   correlation identities on the settlement; a path-only refusal variant
   carrying no `actual`; the discriminated live/replay `file_outline` input and
   caller-known observation key on request, settlement, and successful output;
   and an explicit recovery-state result in both the operation and MCP unions.

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
5. After restart, can I remove or deny the workspace and still obtain a
   `file_outline` result equal to the live one under `replayProjection`?

### Agent playback

1. Which exact Edict source, Core artifact, Target IR artifact, schemas,
   lawpack, and adapter identity produced the request and settlement?
2. Do the request, claim, settlement, decoder evidence, and read-view evidence
   agree on request identity, roots, workspace identity, aperture, causal
   basis, and observed workspace basis?
3. Are the WAL positions and authority counters machine-asserted?
4. Can any production branch reach `LiveWorkspaceReadSource`, Git, git-warp,
   an external process, or `unsafeAdmittedWorkspaceSnapshotForTest` during
   replay? Process execution is listed explicitly because the production prose
   projector shells out (`src/adapters/colorful-cli-prose-projector.ts`), so a
   replay that closes only the workspace observer is still open.
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
