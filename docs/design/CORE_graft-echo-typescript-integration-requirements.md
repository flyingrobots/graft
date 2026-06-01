# Graft Echo TypeScript Integration Requirements

Status: planning packet.

Source: post-`v0.8.0` Graft schema-authority planning and Echo contract-host
gap investigation.

## Hill

Graft can integrate with Echo from TypeScript through an app-safe, generated
contract-host client surface while preserving Graft-owned structural semantics
and keeping Echo generic.

This document names what Graft needs from Echo, what Graft must build itself,
what should remain out of Echo core, and when a Rust rewrite would be worth
considering.

## Executive Summary

The next Graft work does not require Echo to learn Graft semantics. Echo should
not add built-in concepts such as symbols, dead code, parser runs, structural
churn, git-warp imports, or Graft evidence labels.

Graft needs Echo to provide a generic app-safe contract-host substrate that can
be consumed from TypeScript:

```text
Graft-authored GraphQL schema
  -> Wesley-generated contract artifacts
  -> Echo-compatible package metadata
  -> app-safe TypeScript/Node client
  -> submit intent / observe outcome / request bounded query reading
  -> retained evidence posture and recovery evidence
```

The main Echo requirements are therefore generic substrate and packaging
requirements:

1. App-safe TypeScript/Node integration surface.
2. Versioned Echo artifacts and compatibility metadata.
3. Durable retained evidence recovery.
4. WAL/WSC causal-history storage and export posture.
5. Product-facing typed outcome and obstruction mapping.
6. Optional structural-history-shaped consumer fixture.

None of those require Echo core to know Graft domain nouns.

## Acceptance Criteria

- Graft-owned responsibilities and Echo-owned responsibilities are explicitly
  separated.
- Echo requirements are stated as generic substrate, packaging, retention,
  outcome, and TypeScript integration needs, not as Graft-domain semantics.
- The app-safe TypeScript client surface excludes trusted host authority such as
  package installation, ticking, WAL mutation, runtime recovery, and scheduler
  control.
- The first four Graft slices can proceed without Echo repository changes:
  evidence label alignment, Echo package descriptor, fake Echo-shaped TypeScript
  witness, and `StructuralReadingPort` generated-model parity.
- The Echo integration gate is explicit before any follow-on work claims real
  `echo-native` evidence.
- Rust rewrite criteria are named as a later decision gate, not as scope for the
  next Graft schema-authority work.

## Current Assumptions

- Graft remains TypeScript for now.
- Graft integrates with Echo from TypeScript, Node, or a TypeScript-facing
  package/transport.
- Echo remains a generic deterministic WARP runtime over witnessed causal
  history.
- Wesley remains the compiler boundary for GraphQL-authored contracts.
- Graft owns structural-history semantics.
- Echo owns generic admission, execution, readings, receipts, retained evidence
  posture, and replay surfaces.
- git-warp remains a migration/import/fallback source until parity is proven.

## Non-goals

- Do not rewrite Graft in Rust as part of the next schema-authority work.
- Do not add Graft semantic concepts to Echo core.
- Do not hand-port git-warp's graph model into Echo.
- Do not make Echo responsible for deciding whether a fact is
  `echo-native`, `git-warp-imported`, or `fallback-translated`.
- Do not expose trusted Echo runtime control through Graft's app-facing
  TypeScript integration.
- Do not require durable Echo retention for the first schema/model alignment
  slice.
- Do not block Graft's next schema-first work on Echo release packaging.

## Graft-Owned Responsibilities

Graft must own these pieces.

| Responsibility | Graft requirement |
| :--- | :--- |
| Structural semantics | Define canonical structural-history facts in `schemas/graft-structural-history.graphql`. |
| Evidence labels | Preserve Graft-level labels: `echo-native`, `git-warp-imported`, and `fallback-translated`. |
| Port boundary | Keep `StructuralReadingPort` as the Graft-facing read boundary while moving payloads toward generated types. |
| Public behavior | Preserve current API, CLI, and MCP outputs while the substrate changes underneath. |
| Package identity | Define a Graft structural-history package descriptor for Echo installation. |
| Adapter policy | Map Echo outcomes, readings, retained posture, and obstructions into Graft's own DTOs. |
| Migration parity | Compare Echo-backed outputs against current git-warp-backed outputs before demoting git-warp. |
| Import provenance | Preserve git-warp source provenance when facts are imported into the canonical Graft schema. |
| Fallback posture | Keep fallback git-warp reads explicitly labeled as fallback-translated evidence. |

Graft should expose a dependency boundary like:

```text
API / CLI / MCP use case
  -> StructuralReadingPort
  -> generated Graft structural-history model
  -> Echo client adapter or git-warp fallback adapter
  -> normalized Graft payload
```

The Graft codebase should not spread Echo runtime concepts through tools,
commands, or public response objects.

## Echo-Owned Responsibilities

Echo should own these pieces generically.

| Responsibility | Echo requirement |
| :--- | :--- |
| App-safe submission | Accept canonical generated intent bytes without ticking or executing synchronously. |
| Outcome observation | Expose typed applied, rejected, pending, unknown, and obstructed intent outcomes. |
| Query readings | Support bounded QueryView readings through installed generated observers. |
| Contract hosting | Install generated contract packages with mutation handlers and read-only query observers. |
| Compatibility verification | Reject generated packages that do not match ABI, schema hash, codec, registry, helper API, or generator expectations. |
| Retained evidence posture | Expose available/missing retained material posture without faking success. |
| Durable recovery | Distinguish local retention posture from restart-proof retained material recovery. |
| Replay proof | Preserve deterministic replay of accepted submissions, receipts, outcomes, and readings. |
| Release packaging | Publish or document versioned artifacts that TypeScript consumers can depend on. |

Echo should not own these pieces:

| Non-responsibility | Reason |
| :--- | :--- |
| Symbol identity | Graft semantic model. |
| Dead symbol definition | Graft semantic model. |
| Structural churn meaning | Graft semantic model. |
| git-warp import classification | Graft migration policy. |
| Graft fallback labels | Graft evidence policy. |
| Review readiness policy | Graft product/API behavior. |

## Required TypeScript Integration Surface

Because Graft is TypeScript, the key Echo requirement is not "more Echo core
semantics." It is a TypeScript-consumable app-safe client surface.

Graft needs a TypeScript-facing Echo client that can do this:

```ts
interface EchoContractClient {
  verifyPackageCompatibility?(
    request: EchoPackageCompatibilityRequest,
  ): Promise<EchoPackageCompatibilityResult>;
  submitIntent(request: EchoIntentSubmissionRequest): Promise<EchoIntentSubmissionHandle>;
  observeIntentOutcome(submissionId: string): Promise<EchoIntentOutcome>;
  observeQuery(request: EchoQueryObservationRequest): Promise<EchoQueryObservationResult>;
  loadRetainedEvidence?(request: EchoRetainedEvidenceRequest): Promise<EchoRetainedEvidenceResult>;
}
```

The exact names do not matter. The authority boundary does.

Package installation is not part of the app-safe client. App code may verify
that its generated package metadata is compatible with the configured Echo host,
but mutation of the installed package registry belongs to a separate trusted-host
entry point.

### App-safe TypeScript methods

The app-facing TypeScript surface may expose:

| Method family | Purpose |
| :--- | :--- |
| Generated intent helpers | Build canonical operation vars and envelopes. |
| Package compatibility checks | Verify the generated package fits the Echo runtime. |
| Intent submission | Submit canonical intent bytes and receive stable submission identity. |
| Intent outcome observation | Poll for pending, applied, rejected, unknown, or obstructed outcome. |
| Bounded query observation | Request a QueryView reading with explicit basis, aperture, rights, and budget. |
| Retained evidence posture | Inspect available/missing retained material refs. |
| Retained evidence load | Load retained bytes by semantic coordinate when the configured host allows it. |

### Forbidden TypeScript methods

The app-facing TypeScript surface must not expose:

| Forbidden method family | Reason |
| :--- | :--- |
| `tick`, `step`, `superTick`, or scheduler controls | Application code must not create ticks. |
| Trusted runtime start/stop/drain control | Host policy, not application behavior. |
| Package installation authority | Installing packages changes runtime-owner configuration and must live in a trusted-host API. |
| WAL append or recovery mutation | Durable recovery authority is trusted-host scope. |
| Raw kernel object mutation | Graft should operate through generated contracts and readings. |
| Scheduler fault recovery | Trusted runtime control plane. |

If Echo publishes both app and trusted-host packages, they should be physically
separate entry points. Graft should import only the app-safe entry point for
normal operation.

## Echo Requirements Matrix

### R1. App-safe Node/TypeScript client

Status: required for direct Graft integration.

Graft needs a TypeScript/Node client or equivalent transport wrapper that
preserves Echo's app/host authority split.

Acceptance criteria:

- TypeScript can submit canonical generated intent bytes.
- TypeScript can observe intent outcome without ticking.
- TypeScript can request bounded QueryView readings.
- TypeScript can inspect contract evidence and retained posture.
- The app package does not export scheduler, package-install, WAL, or recovery
  authority.
- Examples do not call trusted runtime control from application code.

Graft impact:

- Without this, Graft can still proceed with schema work and fake Echo-shaped
  witnesses.
- Real Echo-backed Graft in Node will require either this surface, a daemon
  client, or a CLI bridge.

### R2. Versioned Echo artifact and compatibility story

Status: required before release-grade Graft/Echo integration.

Graft needs deterministic dependency and compatibility metadata so a Graft CI
job can prove that its generated structural-history package fits the Echo
runtime it is using.

Acceptance criteria:

- Echo documents package names and versions for the runtime/client artifacts.
- Echo exposes supported Echo contract ABI version.
- Echo exposes supported WASM ABI version if a WASM package ships.
- Echo exposes supported contract-host helper API version.
- Echo names compatible Wesley generator versions.
- Echo package install rejects incompatible schema hash, artifact hash, codec,
  registry layout, helper API, or generator version.
- Local sibling checkout overrides are documented as development-only.

Graft impact:

- Graft can pin Echo package/runtime versions in `package.json` or CI.
- Graft can fail fast when generated artifacts drift from the runtime.
- Graft release checks can avoid "works on my sibling checkout" behavior.

### R3. Durable retained evidence recovery

Status: required before Echo can be Graft's primary durable structural-history
substrate.

Echo already has local retained evidence posture and semantic retention
concepts, but Graft needs a durable recovery story before claiming that
structural readings are recoverable evidence rather than process-local
observations.

Acceptance criteria:

- Echo distinguishes query identity, semantic retention coordinate, and content
  hash.
- Retained reading payload refs can survive restart when backed by configured
  storage.
- Retained reading envelope refs can survive restart when backed by configured
  storage.
- Retained receipt refs can survive restart when backed by configured storage.
- Missing retained material returns typed missing-retention posture.
- Cache hits are not treated as evidence unless semantic coordinate and content
  digest match.
- Durable recovery evidence names WAL/WSC or equivalent storage proof.

Graft impact:

- Graft can label an Echo-backed structural reading as `echo-native` only when
  the fact was written/read through the generated Echo-backed structural-history
  model.
- Graft should not imply durable evidence if Echo only reports local missing or
  process-local retained posture.
- Graft should surface unavailable or degraded retained material honestly.

### R4. WAL/WSC causal-history storage and export posture

Status: required for portable, recoverable structural-history archives.

Graft's structural history may eventually need to move across machines,
workspaces, CI jobs, or archives. Echo should define how WAL and WSC carry
causal-history evidence without making graph facts the bootstrap recovery
authority.

Acceptance criteria:

- Echo documents WAL bytes as durable commit authority.
- Echo documents WARP graph WAL nodes as projected evidence, not recovery
  authority.
- Echo defines ref-only WSC export.
- Echo defines self-contained WSC export.
- Echo defines CAS-addressed WSC export.
- Echo defines unavailable WAL or retained material posture.
- Echo avoids absolute host paths as causal identity.

Graft impact:

- Graft can eventually export/import structural-history evidence without
  preserving host-specific paths.
- Graft can distinguish portable evidence from local-only evidence.
- Graft can avoid accidentally treating transient graph projections as durable
  truth.

### R5. Product-facing outcome and obstruction mapping

Status: required for good Graft adapter ergonomics.

Graft needs typed outcomes and obstructions that can be mapped into Graft
freshness/residual/evidence posture without stringly catch-all error handling.

Acceptance criteria:

- Unsupported operation is typed.
- Unsupported query is typed.
- Admission obstruction is typed.
- Runtime fault is typed.
- Missing retention is typed.
- Stale basis is typed.
- Residual reading is typed.
- Budget exceeded is typed.
- Applied and rejected outcomes carry receipt evidence.
- Runtime faults do not masquerade as lawful domain rejections.

Graft impact:

- `StructuralReadingPort` can map Echo failures into Graft posture:
  `current`, `stale`, `incomparable`, `unknown`, `partial`, `budget-limited`,
  `rights-limited`, `unavailable`, `obstructed`, or `degraded`.
- Public Graft outputs can remain stable while internal error handling becomes
  more precise.

### R6. Structural-history-shaped external fixture

Status: optional but useful.

Echo already has a serious external consumer proof fixture. A
structural-history-shaped fixture would add confidence that Echo's generic
contract-host path works for a Graft-like read-heavy package without making
Graft semantics part of Echo core.

Acceptance criteria:

- Fixture package installs through the generic package boundary.
- Fixture uses structural-history-like operation/query names in test code only.
- Query observer returns bounded structural reading bytes.
- Reading carries query identity.
- Reading carries contract evidence.
- Reading carries retained evidence posture.
- Echo core does not gain Graft symbols, parser runs, or git-warp nouns.

Graft impact:

- Provides cross-repo confidence before a real Graft/Echo integration PR.
- Should not block Graft schema-first work.

## Graft Integration Modes

### Mode A. Fake Echo-shaped transport

Use a Graft-local fake transport to prove the app-facing contract without a real
Echo dependency.

Use this for:

- first schema/model tests;
- DTO/evidence label mapping;
- public behavior preservation;
- parity fixtures.

Pros:

- Fast.
- No cross-repo dependency.
- Good for RED/GREEN cycles.

Cons:

- Does not prove real Echo package compatibility.
- Does not prove retention/replay.

### Mode B. Echo CLI or daemon bridge

Use a process boundary from TypeScript to a real Echo host.

Use this for:

- early real Echo witness if Node/WASM package is not ready;
- CI experiments;
- avoiding Rust rewrite while preserving host authority split.

Pros:

- Works from TypeScript.
- Keeps trusted runtime authority out of Graft process if designed correctly.
- Can be replaced later by a Node/WASM package.

Cons:

- Needs stable CLI/daemon contract.
- Process management and error mapping can become glue debt.
- Harder to package for npm.

### Mode C. App-safe Node/WASM package

Use a published app-safe Echo package from Graft TypeScript.

Use this for:

- release-grade Graft/Echo integration;
- npm-friendly distribution;
- stable generated contract workflows.

Pros:

- Best fit for current Graft TypeScript architecture.
- Can preserve app/host split if package exports are strict.
- Stronger than shelling out.

Cons:

- Requires Echo JS/WASM/Node release surface.
- Requires careful package export tests to avoid leaking trusted authority.

### Mode D. Rewrite Graft in Rust

This is not the recommendation for the next work.

Rust may become compelling only if the cost of maintaining a TypeScript-to-Echo
bridge exceeds the cost of moving Graft's core engine to Rust.

## Rust Rewrite Consideration

There is a real argument for Rust, but it is not yet decisive.

### Reasons to keep Graft TypeScript now

- Graft is already a TypeScript MCP/API/CLI-oriented project.
- Existing public surfaces are TypeScript/Node-friendly.
- The immediate work is schema authority, generated DTO alignment, and adapter
  boundaries, not hot-path runtime execution.
- Echo's app-safe client boundary should make TypeScript consumption viable.
- A rewrite would delay schema-authority work and risk broad behavioral drift.
- Graft's value is governed structural reading and provenance for agents, not
  raw runtime throughput yet.

### Reasons Rust could become compelling later

- If Graft needs in-process Echo runtime hosting rather than an app-safe client.
- If TypeScript/WASM boundary costs dominate structural reading latency.
- If structural parsing, indexing, and retention become CPU-bound enough that
  Rust materially changes product capability.
- If Graft becomes a long-running daemon that must share memory/substrate types
  with Echo.
- If generated contract handlers are Rust-first and TypeScript bindings remain
  second-class.
- If Graft needs strong compile-time guarantees around evidence typing that are
  too awkward in TypeScript.

### Rust decision gate

Do not rewrite because "Echo is Rust." Consider Rust only if at least three of
these become true:

- A real Echo-backed Graft witness cannot be made reliable through an app-safe
  TypeScript client.
- The TypeScript bridge forces duplicated contract/runtime models that Wesley
  cannot eliminate.
- Performance profiling shows TypeScript is the bottleneck for structural
  reading workloads.
- npm packaging cannot safely preserve Echo's app/host authority split.
- Graft daemon operation requires direct Rust Echo runtime hosting.
- The adapter layer becomes more complex than the Graft domain model.

Until then, the better architecture is:

```text
Rust Echo substrate
  -> app-safe TypeScript client or daemon bridge
  -> TypeScript Graft structural intelligence
```

Not:

```text
rewrite Graft before schema authority is real
```

## Suggested Echo Planning Cards

### `PLATFORM_graft-app-safe-typescript-client`

Hill:

Echo exposes or documents an app-safe TypeScript/Node integration surface that
lets Graft submit generated contract intents, observe outcomes, request bounded
QueryView readings, inspect retained evidence posture, and verify compatibility
without receiving trusted runtime authority.

Acceptance criteria:

- TypeScript can submit canonical generated intent bytes.
- TypeScript can observe typed outcomes.
- TypeScript can request bounded query readings.
- TypeScript can inspect retained evidence posture.
- App package does not export tick, package install, WAL append, runtime
  recovery, or raw mutation authority.
- Trusted-host package, if published, is a separate entry point.
- Example integrates a generated non-jedit package without app nouns in Echo
  core.

### `PLATFORM_graft-ready-retained-evidence-recovery`

Hill:

Echo can recover retained contract evidence needed by a Graft structural reading
after restart, or report typed missing-retention posture without fake success.

Acceptance criteria:

- Retained reading payload recovery fixture.
- Retained reading envelope recovery fixture.
- Retained receipt recovery fixture.
- Missing coordinate and missing content remain distinct.
- Recovery proof names WAL/WSC or configured durable storage evidence.

### `RELEASE_echo-contract-host-artifact-set`

Hill:

Echo publishes or documents a versioned contract-host artifact set that Graft
can consume without relying on undocumented sibling checkout paths.

Acceptance criteria:

- Runtime ABI/version documented.
- WASM ABI/version documented if shipped.
- Helper API version documented.
- Compatible Wesley generator range documented.
- Package metadata verification fixture.
- Release dry-run checks metadata.
- Local sibling override documented as dev-only.

### `PLATFORM_structural-history-contract-consumer-fixture`

Hill:

Echo proves a structural-history-shaped generated contract package can install,
emit bounded query readings, attach evidence, and replay without adding Graft
domain nouns to Echo core.

Acceptance criteria:

- Fixture uses structural-history-like operation/query names only in test code.
- Package installs through generic boundary.
- Query observer returns bounded payload bytes.
- Reading identity and retained posture are present.
- Replay converges.
- Echo core remains app-neutral.

## Suggested Graft Planning Cards

### `CORE_structural-history-evidence-label-alignment`

Hill:

Graft aligns `StructuralReadingPort` evidence labels with
`schemas/graft-structural-history.graphql` while preserving current public
behavior.

Acceptance criteria:

- Generated schema model names `ECHO_NATIVE`, `GIT_WARP_IMPORTED`, and
  `FALLBACK_TRANSLATED`.
- Graft DTOs can represent `echo-native`, `git-warp-imported`, and
  `fallback-translated`.
- Existing git-warp-backed readings remain fallback-translated or imported, not
  native.
- Public command outputs are unchanged unless explicitly authorized.

### `CORE_graft-structural-history-echo-package-descriptor`

Hill:

Graft defines the structural-history package descriptor it would install into
Echo, without requiring a real Echo runtime dependency in the first slice.

Acceptance criteria:

- Package identity includes schema path, schema hash, artifact hash, codec ID,
  operation/query IDs, and compatibility metadata.
- Descriptor derives from generated artifacts or manifest data.
- Hand-maintained duplicate model is rejected by tests.
- No Echo core dependency is required.

### `CORE_graft-fake-echo-shaped-typescript-witness`

Hill:

Graft proves its Echo-facing adapter contract through a fake Echo-shaped
TypeScript witness before depending on real Echo runtime packaging.

Acceptance criteria:

- Fake client supports submit intent, observe outcome, observe query, and
  retained posture.
- Graft maps fake Echo outcomes into `StructuralReadingPort`.
- Parity fixtures compare fallback git-warp readings with generated model
  readings.
- Tests fail if Graft leaks trusted-host authority into the app-facing adapter.

### `CORE_structural-reading-port-generated-model-parity`

Hill:

Graft maps current `StructuralReadingPort` payloads into the generated
structural-history model while preserving public command behavior.

Acceptance criteria:

- Current `StructuralReadingPort` payloads have a tested generated-model
  mapping.
- Parity fixtures show current git-warp-backed readings produce equivalent
  public behavior.
- Mapped evidence is labeled `git-warp-imported` or `fallback-translated`, not
  `echo-native`.
- No Echo runtime dependency is introduced.

## Sequencing Recommendation

Recommended parallel plan:

| Step | Repo | Work |
| :--- | :--- | :--- |
| 1 | Graft | Align evidence labels and generated structural-history model. |
| 2 | Graft | Define Echo package descriptor shape from schema/generated manifest. |
| 3 | Graft | Build fake Echo-shaped TypeScript witness. |
| 4 | Echo | Plan app-safe TypeScript/Node client surface. |
| 5 | Echo | Finish retained evidence durability boundary. |
| 6 | Echo | Finish package publish/versioning artifact story. |
| 7 | Graft + Echo | Add real local Echo witness from TypeScript. |
| 8 | Graft | Move selected structural reads to Echo-backed primary path after parity. |

This keeps Graft moving now while giving Echo a focused list of generic
requirements.

## Playback Questions

1. Can a human tell which Graft slices can proceed before Echo changes are
   required?
2. Can a reviewer verify that Echo is not asked to learn Graft domain semantics?
3. Does the app-safe TypeScript surface avoid trusted host authority such as
   package installation, ticking, WAL mutation, runtime recovery, and scheduler
   control?
4. Can a future agent identify the Echo integration gate before claiming real
   `echo-native` evidence?
5. Do the suggested Graft planning cards match the actual `asap/` cards and
   their intended order?
6. Is the Rust rewrite decision deferred behind concrete TypeScript integration
   evidence instead of treated as near-term scope?

## Open Questions

1. Should Graft's first real Echo integration use a Node/WASM package, an Echo
   daemon/CLI bridge, or a Rust helper process?
2. Should package installation be entirely trusted-host scope, with Graft
   receiving only a preinstalled app-safe client, or should Graft own a local
   trusted-host mode for development?
3. What is the minimum Echo artifact set Graft can depend on in CI without
   requiring a sibling Echo checkout?
4. Should retained structural reading payloads be required for all
   `echo-native` readings, or can some native readings report durable receipt
   evidence with missing payload posture?
5. Should Graft's npm package eventually bundle an Echo client, peer-depend on
   one, or discover an external Echo host?

## Decision Record

For now:

- Keep Graft TypeScript.
- Do not require Echo changes for the next Graft schema-authority slice.
- Plan Echo work around app-safe TypeScript consumption, durable retention,
  WAL/WSC export posture, and versioned package artifacts.
- Revisit Rust only after a real TypeScript Echo witness exposes unacceptable
  complexity, performance, or authority-boundary problems.
