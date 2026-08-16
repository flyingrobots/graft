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
    entryKind                   # REGULAR | SYMLINK -- schema-bound, see below
    bytes                       # inline only for this cycle; see below
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
    G->>E: Recover settlement selected by the replay key
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
selection is a lookup rather than a search. Recovery that finds no settlement
for the key is `pending` or `outcome-unknown` per invariant 12 — it never falls
back to the newest record, because "newest" is exactly the nondeterminism this
decision exists to remove.

Choosing the concrete key shape is implementation work for this cycle. What the
packet fixes is that the choice must be explicit, deterministic, and proven
against **more than one settlement for the same aperture** — a single-record
fixture cannot distinguish a correct rule from no rule at all.

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
      per-file digests, per-entry kind, and an exact observed workspace basis.
      Retained content references are out of scope for this cycle — see the
      canonical settlement contract for why the branch was removed rather than
      left permitted-but-untested.
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
      Colorful-supported input such as `.txt`, the live path can return a prose
      outline while a projector-less replay returns `UNSUPPORTED_LANGUAGE` —
      replay would then silently change a user-visible result and still satisfy
      a zero-process counter. Exactly one of:
      (a) the projection is retained and versioned as settlement content and
      replayed from it; or
      (b) the projector is removed **symmetrically from both executions**, so
      live and replayed results agree by construction.
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
- [ ] A replay key with no retained settlement yields `pending` or
      `outcome-unknown`, never a fallback to the most recent record.
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
requestWalPosition < firstFilesystemReadPosition
settlementWalPosition < firstGraftAnalysisReadPosition
settlement.requestIdentity == request.requestIdentity
settlement.requestedRoot == request.requestedRoot
settlement.resolvedRoot == request.resolvedRoot
settlement.workspaceIdentity == request.workspaceIdentity
settlement.admittedAperture subsetOf request.aperture
replayProjection(liveFileOutlineResult) == replayProjection(restartedFileOutlineResult)
restartedFilesystemReads == 0
restartedGitWarpOpens == 0
restartedProcessExecutions == 0
restartedDirectGitOperations == 0
preRequestWorkspaceMetadataReads == 0
deniedPathRetainedSettlements == 0
```

The filesystem counter covers all metadata and content operations performed by
the external observation authority, not only calls named `readFile`.

The process counter covers every `processRunner.run` invocation reachable from
the replayed call, including prose projection.

The direct-Git counter covers `GitClient` operations that do not pass through
git-warp, including any invoked while reconstructing a causal basis. Without
it, invariant 9 has no evidence: the two existing counters both miss that path.

`preRequestWorkspaceMetadataReads` covers `lstat`, `realpath`, and equivalent
metadata calls made before the request is retained — see the pre-request path
resolution criterion above for why that count is not already zero today.

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

- **kept — semantic, determined by the retained bytes:** `path`, `outline`,
  `jumpTable`, `partial`, `reason`, `error`, and the refusal fields
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
   fails if no durable request commit is visible at the first operation.
3. An analysis-read spy fails if no durable settlement commit is visible at
   the first Graft read.
4. A restart test closes all live observer authority, reopens only Echo
   history, reconstructs the view, and compares results under
   `replayProjection` — not by raw structural equality, which cannot hold.
5. Decoder tests reject malformed correlation, substituted roots, widened
   apertures, wrong digests, over-budget bytes, non-success posture, and
   mutable/aliased retained content.
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
5. `file_outline` live execution and restart replay proof, including the
   `replayProjection` definition and the test asserting it is total over
   `FileOutlineResult`.
6. Instrumented causal-order evidence and every counter the acceptance list
   requires: filesystem reads, git-warp opens, direct Git operations, process
   executions, pre-request workspace metadata reads, and denied-path retention.
   Listing them here rather than "and so on" is deliberate — an acceptance
   criterion whose instrumentation is outside the implementation boundary
   cannot be met by the cycle that owns it.
7. The contract additions the acceptance list depends on: `entryKind` per
   admitted entry, the two identity fields on the request, a path-only refusal
   variant carrying no `actual`, and an explicit recovery-state result in both
   the operation and MCP unions.

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
