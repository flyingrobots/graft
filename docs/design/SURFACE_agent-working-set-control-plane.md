---
title: "Agent working-set control plane"
legend: "SURFACE"
cycle: "agent-native-campaigns"
source_feedback: "docs/feedback/2026-07-14-codex-agent-native-campaigns.md"
external_source_sha256: "d7be1d945730630abbe466b014b6c52121956becaae6d66ee4277aa5a5d86354"
inspected_graft_commit: "5b9c4a866c9938e31cd159c0639ee9dedbaed1ea"
corroborating_local_commit: "f9df3e7ed22bf2a7951f055efb838aac567b52eb"
supersedes_unmerged_commit: "86820e71ae9366ac952077be4ccc3da92fad0839"
---

# Agent working-set control plane

## Sponsors

- Human: James
- Agent: Codex

## Hill

Graft applies its bounded-read discipline to its own control plane: ordinary
agent calls receive compact evidence, routine diagnostics answer the immediate
question before exposing detail, and an initial repository snapshot is never
described as movement that Graft did not observe.

The first campaign also gives agents one compact capability map for discovering
the intended next Graft call without renaming the existing public tools. Before
that map lands, Graft exposes its already-versioned output contracts through
MCP-native `outputSchema` and `structuredContent` so agents and hosts do not
have to reverse-engineer serialized JSON text.

## Source and confidence

The primary feedback was captured outside this repository and is preserved as
an in-repo witness at `docs/feedback/2026-07-14-codex-agent-native-campaigns.md`.
That witness pins the original document by SHA-256 and records the measurements,
recommendations, and routing decisions needed to reproduce this campaign. It
inspected Graft at `5b9c4a86`, whose parent is the `origin/main` branch point
for this cycle (`c3885dab`). The control-plane observations therefore describe
the current main implementation; the only intervening inspected commit was the
unrelated Echo command-kernel transport.

An independent Claude session recorded the same receipt-overhead finding in
local commit `f9df3e7e`: a 465-byte file produced a 1,461-byte response because
every call repeated cumulative counters. The durable witness includes that
measurement and recommendation, so reviewers do not need the local-only Git
object. This cycle stays rooted at `origin/main` as the operator requested.

The pushed but unmerged commit `86820e71` is prior art, not a merge base. It is
based on an old main, combines obsolete workspace-onboarding work with an
opt-in compact receipt, and has no completed retro. This packet supersedes that
attempt. Relevant ideas and tests may be ported deliberately; the commit must
not be cherry-picked wholesale.

## Problem statement

Five current behaviors make Graft less useful to an agent than its precision
read model suggests:

1. Every response repeats a full cumulative receipt, including the complete
   burden-by-kind map. Small domain payloads can cost less than their metadata.
2. `doctor` and `activity_view` already compute concise summaries, but their
   default responses also include exhaustive diagnostic and event state.
3. The first dirty workspace snapshot can be classified as a bulk transition
   even though no earlier observation exists, and an unchanged dirty snapshot
   can continue to look like movement.
4. The capability registry is authoritative, but agents have no small product
   map that presents the intended tool families and opening calls.
5. Graft validates strict, versioned output schemas internally, but MCP tool
   discovery advertises only input schemas and successful calls return the
   machine-readable result only as serialized text. Hosts cannot use MCP's
   native output validation or structured-result path.

Metadata volume and truth wording are product-correctness concerns for a tool
whose purpose is to conserve context and support lawful decisions.

## Campaign boundary

This is a Graft control-plane campaign, not an Echo or git-warp migration slice.
It changes neither structural-history provider nor structural-history facts.

The wider feedback is routed as follows:

| Feedback seam | Destination |
| :--- | :--- |
| Compact receipts; summary diagnostics; baseline truth; capability discovery | This campaign |
| MCP-native bounded output schemas and structured results | This campaign |
| Actor bootstrap; one-call orientation; portable checkpoint/resume | Later Graft session-lifecycle campaign |
| Readiness/phase timing; durable job handles | Later Graft durable-operations campaign |
| Write observation; generic evidence references | Later Graft observation/evidence campaign |
| Transactional governed patches | Later Graft governed-mutation campaign |
| Multi-repo goalposts, backlog slices, dependency DAGs, retros, release truth | Method MCP / Method CLI |
| GitHub issue, review, CI, and merge-gate projections | Typed GitHub/Method integration |

Graft may expose bounded, authorization-filtered repo facts for those consumers,
but it must not absorb METHOD-specific workflow state. This follows the product
boundary in `docs/BEARING.md`.

## Observation law

A snapshot supports an endpoint claim; a semantic transition is a stronger
claim about evidence connecting endpoints. Equal snapshots therefore support
neither a movement claim nor a claim that no movement occurred. In this
contract, `semanticTransition: null` means that the available evidence supports
no transition claim. Independent Git transition evidence may still support a
transition when the visible endpoint projection is unchanged.

This is why observation basis is part of the structured contract and durable
transition identity rather than an inference from summary prose.

Legacy persisted transition records that predate this field decode as
`legacy_unclassified`. That compatibility posture preserves the record without
inventing either current-state authority or an observed delta. It is valid only
for historical event decoding and is not a live semantic-transition basis.

## Acceptance criteria

### Slice 1: baseline observation truth

- The first snapshot of an ordinary dirty repository may report staged,
  unstaged, and untracked baseline facts, but it does not claim that movement
  occurred in this Graft session.
- An authoritative first observation may report that a merge, rebase, or
  conflict phase is currently active. It uses static current-state wording and
  must not say the phase started, emerged, continued, or moved in this session.
- Semantic transition output distinguishes `current_state`, `snapshot_delta`,
  and `git_transition_evidence` observation bases.
- Movement wording is reserved for an authoritative delta between observations
  or direct Git transition evidence.
- A later snapshot with an unchanged dirty or active-phase status does not
  create a new movement merely because that state remains present.
- The reflog entry captured during initialization is baseline evidence. A
  same-second timestamp cannot upgrade an unchanged entry into newly observed
  movement; direct reflog evidence requires a changed record.
- Durable `snapshot_delta` events do not inherit Git-transition kind, refs, or
  checkout-epoch creation from a previously retained checkout/reset.
- Separate occurrences of the same semantic endpoint receive separate durable
  event identities while repeated persistence of one observation remains
  idempotent. Their `follows` edges remain an acyclic occurrence chain.
- Current workspace facts remain inspectable even when `semanticTransition` is
  `null`; suppressing an invented transition must not suppress the baseline.
- Regression tests assert structured truth classes, not incidental prose.

### Slice 2: compact receipt policy

- Every MCP tool accepts a common optional `receipt` input with `compact` and
  `full` policies.
- `compact` is the MCP default. `full` retains the existing cumulative receipt
  fields for explicit audit/debugging.
- Both receipt variants carry an explicit `mode` discriminator. A compact
  receipt contains only `mode`, a runtime-log correlation `receiptId`, sequence,
  reason, latency, and final encoded response byte count. The response `_schema`
  and domain payload continue to identify the tool and projection.
- `receiptId` identifies the matching runtime-observability record. It is not a
  promise that the receipt can be fetched later; full detail must be requested
  on the original call in this slice.
- Compact receipt metadata is at most 512 encoded bytes. Tests measure encoded
  bytes deterministically; they do not assert wall-clock latency.
- This is an intentional breaking MCP-default change for package `0.12.0`.
  Every MCP output schema advances from version `1.0.0` to `2.0.0`; CLI output
  schema versions remain unchanged because CLI peers explicitly request full
  receipts.

- Slice 1 adds the required live `observationBasis` field while this branch
  still advertises the version-1 MCP shape. It is therefore an unreleased
  intermediate commit and must not merge or release independently. Slice 2's
  version-2 schema transition is the public compatibility boundary for both
  changes.
- A no-argument MCP call receives the version-2 compact receipt. Existing MCP
  clients that require cumulative receipt fields must update to request
  `receipt: "full"` and validate the version-2 full variant.
- `stats` remains the explicit cumulative counter surface.
- Tripwires remain immediate and are never hidden by compact mode.
- Internal metrics, budget accounting, runtime logging, and final
  `returnedBytes` semantics remain based on the actual encoded response.
- CLI peer commands explicitly request full receipts so existing CLI JSON and
  human rendering contracts do not change in this slice. Diagnostic CLI v1
  schemas and payloads project MCP-v2-only `observationBasis` fields away and
  remain structurally identical to `origin/main@c3885dab`.

### Slice 3: summary-first diagnostics

- `doctor()` defaults to a strict summary that answers:
  1. whether Graft is healthy or degraded;
  2. which workspace is active;
  3. whether persisted structural/local history is ready;
  4. which named evidence gaps degrade confidence; and
  5. the single recommended next action.
- Structural-tool authority is not structural-provider readiness. This slice
  reports persisted local-history readiness from owned evidence and reports
  structural readiness as `unknown` with reason `not_observed` until a
  provider-neutral readiness signal exists. Default doctor must not cold-open
  WARP merely to manufacture a readiness answer.
- The default encoded `doctor()` response is below 2 KiB, including its compact
  receipt.
- `doctor({ detail: "full" })` preserves the existing exhaustive response.
  A sludge scan also returns the full response because the scan result is an
  explicitly requested diagnostic section.
- `activity_view()` defaults to its existing bounded summary and window counts,
  without embedding the active causal-workspace object or individual activity
  items.
- The default encoded `activity_view()` response is below 2 KiB, including its
  compact receipt. Its counts describe matching activity, `truncated` remains
  authoritative, and it explicitly reports whether full item detail is
  available.
- Summary references and narrative fields are byte-bounded. When a Git ref is
  abbreviated to preserve the response budget, `headRefTruncated` says so while
  the exact commit SHA remains present; full detail preserves the complete ref.
- `activity_view({ detail: "full" })` preserves the existing grouped item view.
- CLI doctor and activity peers explicitly request full detail so their current
  presentation and JSON contracts remain stable.
- Summary and full variants are strict, versioned output-schema alternatives;
  no untyped optional-property bag is introduced.

### Slice 4: MCP-native structured output

- Every registered public MCP tool advertises an `outputSchema` and returns its
  successful machine-readable result in `structuredContent`.
- The existing serialized JSON `TextContent` remains present for compatibility.
  Parsing that text yields the same JSON value as `structuredContent`; the two
  representations cannot drift.
- Graft's strict versioned Zod schema remains the validation authority. The MCP
  discovery schema is a deterministic bounded projection of that authority,
  not a second hand-maintained contract. Every emitted structured result must
  satisfy both the strict schema and the advertised projection.
- `graft_edit` validates its complete domain response against the strict output
  contract before writing replacement bytes. A response-contract failure must
  leave the target file and session-local structural-edit observations
  unchanged; the finalized receipt remains runtime-owned and is published only
  after the write succeeds.
- Legacy WARP precision matches may still contain optional `identityId` data.
  Strict `code_find` and ambiguous `code_show` output validation preserves that
  compatibility field until the legacy graph path is explicitly migrated.
- The discovery projection preserves top-level answer fields, scalar types,
  enums and discriminants, `_schema` identity, and compact/full receipt posture.
  Deep audit objects are summarized rather than recursively inlined merely
  because the internal validator knows their entire shape.
- A baseline measurement over the current 47 tools produces 479,464 bytes of
  strict generated output schemas, versus 11,319 bytes of input schemas.
  Advertising those strict schemas verbatim is therefore prohibited. The
  daemon-mode aggregate encoded `outputSchema` budget is at most 65,536 bytes,
  and no individual advertised output schema may exceed 8,192 bytes.
- Compact and full receipts, plus summary and full diagnostic bodies, validate
  through the same advertised tool schema. Receipt/detail policy does not
  require separate public tool names.
- `returnedBytes` continues to mean the exact canonical JSON payload encoded in
  compatibility text. It does not silently change to count JSON-RPC framing or
  both equivalent MCP representations.
- Tests use the installed MCP SDK client to prove `tools/list` discovery,
  structured-result validation, strict-schema validation, text/structured
  equivalence, and schema-size budgets. Playback records real client rendering
  separately; this slice does not claim that every host will display or meter
  structured results identically.

### Slice 5: capability discovery

- A compact `capabilities` MCP tool groups currently registered public tools
  into the conceptual families `session`, `workspace`, `read`, `code`,
  `history`, `review`, and `diagnostic`.
- The default response is a summary object with `projection: "summary"`,
  `reason: "CAPABILITY_SUMMARY"`, `discoveryBasis: "registered_surface"`, the
  active `sessionMode`, `registeredToolCount`, and all seven families in the
  fixed order above. Each family contains only `family`, `openingCall`,
  `guidance`, and `toolCount`; it does not dump tool descriptions or internal
  capability fields.
- Supplying one explicit `family` returns `projection: "family_detail"` and
  `reason: "CAPABILITY_FAMILY_DETAIL"`. The selected `family`, `openingCall`,
  `guidance`, `toolCount`, and `tools` remain flat top-level fields so bounded
  MCP discovery preserves their scalar contracts. The tool array contains
  canonical names and descriptions derived from the capability registry.
  Arbitrary multi-family include lists are out of scope.
- The complete compatibility response, including its compact receipt, is at
  most 2,048 UTF-8 bytes for the default summary and at most 4,096 UTF-8 bytes
  for every selected family detail. Explicit full audit receipts are not part
  of these compact-response bounds.
- Discovery is runtime-relative. Repo-local mode advertises exactly the shared
  registry; daemon mode advertises the complete registry. The discovery tool
  is daemon-always-available and repo-state-optional, so an unbound daemon can
  ask what to do without first binding a workspace or cold-observing Git.
- Existing MCP tool names and CLI commands are not renamed or removed.
- The projection is derived from or checked against the authoritative
  capability and runtime registries so it cannot silently advertise a missing,
  duplicate, or wrong-runtime tool. Registration is not represented as current
  authorization: binding, per-call routing, and capability policy may still
  obstruct a registered tool.

The first family contract is intentionally explicit:

| Family | Opening call | Guidance | Tool membership |
| --- | --- | --- | --- |
| `session` | `capabilities` | Choose one bounded workflow family, then request only that family's detail. | `capabilities`, `knowledge_map`, `set_budget`, `state_load`, `state_save` |
| `workspace` | `workspace_status` | Inspect workspace and binding posture before routed or daemon work. | `workspace_status`, `causal_attach`, `daemon_monitors`, `daemon_repos`, `daemon_sessions`, `daemon_status`, `monitor_nudge`, `monitor_pause`, `monitor_resume`, `monitor_start`, `monitor_stop`, `workspace_authorizations`, `workspace_authorize`, `workspace_bind`, `workspace_list_opened`, `workspace_open`, `workspace_rebind`, `workspace_revoke` |
| `read` | `safe_read` | Start with a policy-bounded read and drill into ranges only when needed. | `safe_read`, `changed_since`, `file_outline`, `read_range` |
| `code` | `code_find` | Locate a symbol, then focus or inspect references before editing. | `code_find`, `code_refs`, `code_show`, `graft_edit` |
| `history` | `graft_since` | Start from a named base, then deepen with diff, log, blame, or difficulty. | `graft_since`, `graft_blame`, `graft_churn`, `graft_diff`, `graft_difficulty`, `graft_exports`, `graft_log`, `graft_map` |
| `review` | `graft_review` | Review a bounded ref range before focused coverage or dead-symbol checks. | `graft_review`, `graft_dead_symbols`, `graft_test_coverage` |
| `diagnostic` | `doctor` | Start with summary health and request full detail only to investigate. | `doctor`, `activity_view`, `causal_status`, `explain`, `run_capture`, `stats` |

Within each family the opening call is first and remaining tools use
deterministic code-point order. The fourteen daemon-only workspace tools are
filtered from repo-local family detail and counts. All opening calls remain
registered in both runtimes. The result is 34 registered tools in repo-local
mode and 48 in daemon mode after the new tool is registered.

## Playback questions

### Human

- [x] Does opening a repository with hundreds of pre-existing untracked files
      describe a baseline rather than invented movement?
- [x] Can I request the old full receipt and full diagnostic views explicitly?
- [x] Is the default doctor result small enough to use at every session start?
- [x] Can an MCP client discover and validate Graft's output shape without a
      Graft-specific schema fetch or reverse-engineering response prose?
- [x] Can I discover the intended Graft workflow without reading the full MCP
      registry?

### Agent

- [x] Is a normal precision-read receipt below 512 encoded bytes while retaining
      a stable evidence identifier and exact returned-byte count?
- [x] Does `stats` still expose cumulative burden after compact calls?
- [x] Does default `doctor` name health, workspace, readiness, degradation, and
      exactly one next action in less than 2 KiB?
- [x] Does default `activity_view` omit event bodies while retaining bounded
      counts, truncation truth, and group summaries?
- [x] Can `receipt: "full"` and `detail: "full"` reproduce the explicit audit
      surfaces needed by compatibility clients?
- [x] Does every successful tool call expose one semantically identical value
      through MCP structured content and compatibility JSON text?
- [x] Does native output discovery stay bounded instead of adding the complete
      internal audit schema to every tool definition?
- [x] Does capability discovery recommend only tools registered in this
      runtime, state that registration basis explicitly, and avoid presenting
      registration as authorization?

## Non-goals

- No Echo, git-warp, structural schema, or provider-selection changes.
- No METHOD backlog, goalpost, retro, dependency-DAG, merge, or release state in
  Graft responses.
- No `session_start`, actor declaration, campaign checkpoint, or cross-session
  handoff contract in this campaign.
- No durable public job API, query-performance rewrite, background warming, or
  wall-clock latency gate.
- No filesystem watcher, hook installation, generic evidence ledger, or GitHub
  projection.
- No transactional multi-file patching.
- No public tool renames.
- No hosted schema registry, external schema URI, or new npm schema subpath in
  the first native-output slice. MCP discovery is the first agent-facing
  publication surface; exact on-demand distribution is deferred to
  `SURFACE_on-demand-exact-mcp-output-contracts.md`.
- No `delta` receipt or `receipt_get` store in the first compact-receipt slice.
- No arbitrary `doctor(include: ...)` projection matrix in the first diagnostic
  slice. Focused detail remains available through `causal_status`,
  `workspace_status`, `stats`, and explicit `detail: "full"`; selective include
  contracts require their own strict-schema design.
- No repository-wide cursor retrofit. List/cursor contracts require a separate
  bounded pagination design rather than an incidental schema addition here.

## Test strategy

Follow RED-GREEN per slice and keep each regression focused on observable
software behavior:

1. Temp-repo observation tests establish a dirty baseline, repeat it unchanged,
   then make a real change and prove only the final comparison is a transition.
2. Receipt unit and MCP integration tests measure canonical JSON byte lengths,
   prove compact default/full opt-in, preserve tripwires, and verify cumulative
   stats after compact calls.
3. Doctor and activity tests validate both strict schema variants, encoded size
   budgets, default omission of detail, full compatibility, and CLI full-mode
   behavior.
4. Native-output tests prove output-schema discovery for every registered tool,
   strict and advertised validation, text/structured equivalence, aggregate and
   per-tool schema budgets, and pre-write domain validation for the governed
   exact-edit path.
5. Capability tests prove deterministic family order, registry membership, and
   bounded default output.

Relevant changed-surface validation is `pnpm lint`, `pnpm typecheck`, targeted
unit/playback tests, and the full test command required by the resulting runtime
surface. No timing assertion may depend on ambient machine speed.

## Slice playback witnesses

### Slice 1: baseline observation truth

- A runtime temp repo opens with one staged path, one unstaged path, and 253
  pre-existing untracked paths. Its first and repeated observations preserve
  those workspace facts while returning `semanticTransition: null`; adding the
  254th untracked path produces a `snapshot_delta`.
- Restoring a dirty file to its committed bytes produces and persists an
  `unknown` `snapshot_delta` with zero remaining dirty paths, including inside
  Git's racy-clean timestamp window.
- First and unchanged merge, rebase, and conflict postures remain
  `current_state`. Conflict identity changes produce a delta, while unrelated
  workspace churn does not impersonate conflict progress.
- Fresh checkout and reset evidence remain inspectable as
  `git_transition_evidence` even when the workspace projection is unchanged.
- Unchanged same-second reflog entries remain baseline evidence. Only a changed
  reflog record or independently changed head/ref position supports a new Git
  transition.
- A checkout followed by an ordinary edit persists the edit as a pure
  `snapshot_delta`, with null Git kind, refs, and created-epoch identity.
- Repeating an A-to-B-to-A workspace sequence produces three distinct event
  nodes and a linear acyclic `follows` chain.
- New `current_state` observations are not persisted. Legacy graph records
  without a basis decode as `legacy_unclassified`, and observation basis
  participates in transition event identity.
- The expanded affected constellation passes 11 files and 121 tests, including
  repo-local runtime, production-adapter daemon workers, strict output schemas,
  causal ontology, layered worldlines, and durable graph history. Lint,
  typecheck, and diff hygiene are separate closure gates.

The exact Slice 1 commit (`da1956f7`) passes the full suite from a clean detached
temporary worktree: 246 files and 1,856 tests. The operator's unrelated
cool-idea work remained outside the isolated witness and outside the commit.

### Slice 2: compact receipt policy

- All registered MCP tools, including tools without domain arguments, advertise
  and strictly validate the common optional `receipt` control. Missing policy
  selects compact; explicit `full` selects the audit projection; invalid values
  fail validation.
- Default compact receipts contain exactly `mode`, `receiptId`, `seq`, `reason`,
  `latencyMs`, and `returnedBytes`, remain below 512 canonical UTF-8 bytes, and
  stabilize `returnedBytes` against the final encoded response.
- Explicit full receipts preserve the previous audit, projection, burden,
  budget, compression, and cumulative fields with a `mode: "full"`
  discriminator. The complete internal record remains available to metrics and
  runtime observability even when the public projection is compact.
- Compact `receiptId` is the invocation trace identity and correlates with both
  started and completed runtime-observability events. It does not introduce a
  receipt store or retrieval promise.
- Receipt policy crosses the daemon-worker boundary as a required job field;
  in-process and offloaded calls therefore use the same default and projection.
- MCP schemas advance to version `2.0.0` with strict compact/full alternatives.
  CLI peers request full, project away the MCP-only discriminator, and continue
  validating and emitting their version-`1.0.0` legacy receipt contract.
- Compact calls still contribute their exact encoded bytes to cumulative
  accounting. `stats` exposes those totals, while tripwire warnings remain
  immediate top-level response fields rather than receipt members.
- Focused receipt, schema, stdio, worker, observability, CLI compatibility, and
  playback witnesses pass alongside lint, typecheck, and diff hygiene. The exact
  Slice 2 closure commit (`cb1958f1`) passes the Docker-isolated full suite: 246
  files and 1,868 tests.
- The exact-commit suite exposed a rounded-compression-ratio width cycle that
  focused tests had not triggered. A follow-up regression now preserves exact
  `returnedBytes`; when the optional rounded ratio makes a fixed point
  mathematically impossible, the public full receipt omits that derived field
  while the complete internal audit receipt retains the ratio.

### Slice 3: summary-first diagnostics

- Default `doctor` and `activity_view` responses are strict MCP version-2
  summary variants below 2 KiB, including their compact receipts. Explicit
  `detail: "full"` reproduces the exhaustive bodies; sludge scans force the full
  doctor variant; CLI peers continue to request full detail and validate their
  unchanged version-1 contracts.
- Doctor separates owned local-history readiness from structural readiness. It
  reports structural readiness as `unknown` / `not_observed` rather than
  cold-opening WARP or turning tool authority into invented provider evidence,
  and names degradation through a closed evidence-gap vocabulary.
- Activity summaries preserve anchor identity, returned and matching counts,
  truncation truth, group summaries, and item-detail availability while
  omitting event bodies and the active causal-workspace audit object.
- An adversarial long-ref witness exposed a real budget violation: a legal
  723-character branch produced a 2,919-byte default response. Summary refs and
  narratives are now byte-bounded, `headRefTruncated` makes abbreviation
  explicit, the exact commit SHA remains present, and full detail preserves the
  complete ref. The same witness now encodes to 1,268 bytes.
- A second aggregate witness exercises all four activity kinds plus every
  session tripwire and encodes to 1,879 bytes. The summary budget is therefore
  enforced at the complete compatibility-response boundary, not inferred from
  one independently bounded field.
- The affected compatibility constellation passes 13 files and 129 tests,
  including strict output contracts, MCP discovery, runtime observability,
  layered worldlines, per-call routing, CLI rendering, and Git-heavy playback.
  Lint, typecheck, and diff hygiene also pass.
- The exact Slice 3 commit (`7dec2a9c`) passes the Docker-isolated full suite
  from a clean detached worktree: 247 files and 1,873 tests. The Docker test
  image build also passes typecheck, and the runtime suite reports zero
  failures.

### Slice 4: MCP-native structured output

- Every repo-local and daemon tool advertises an MCP-native object-root
  `outputSchema`. The schema is derived from the strict versioned Zod contract,
  preserving top-level fields, scalar constraints, discriminants, exact
  `_schema` identity, and compact/full receipt posture while projecting deep
  objects and array members shallowly.
- The current strict schemas encode to 498,341 bytes across 47 tools, with
  `doctor` alone accounting for 67,291 bytes. The actual SDK `tools/list`
  discovery projections total 50,093 bytes; the largest is `doctor` at 3,109
  bytes. All roots are objects, below the 65,536-byte aggregate and 8,192-byte
  per-tool budgets.
- Root-object projection is a correctness adapter as well as a size bound. The
  installed SDK cannot directly register the strict `file_outline` root union:
  it omits the output schema during discovery and fails invocation. The derived
  projection flattens object-union fields deterministically and marks
  variant-only fields optional.
- Successful calls derive `structuredContent` by decoding the finalized
  canonical compatibility text, then validate that exact value against both
  the strict schema and discovery projection. The representations therefore
  cannot drift, and strict output-contract violations fail before success.
- The governed exact-edit path separately preflights its domain response before
  the filesystem write. A fault-injection regression proves contract rejection
  leaves file bytes unchanged; successful calls still build and publish the
  finalized receipt after the write.
- Receipt-boundary regressions preserve optional legacy WARP `identityId` data
  for both `code_find` and ambiguous `code_show` results.
- Complete generated-schema digests for `diag_doctor` and `diag_activity` are
  frozen to `origin/main@c3885dab`; nested MCP-v2 observation-basis fields are
  removed before CLI-v1 validation and rendering.
- `returnedBytes` remains the UTF-8 byte count of canonical compatibility text.
  It does not count the equivalent structured representation or protocol
  framing. MCP errors remain usable as text-only `isError` results, as the
  protocol permits.
- In-process API and read-attribution consumers prefer native structured
  content and retain text-only compatibility for older peers. Installed-SDK
  tests exercise compact/full receipts, every root-union tool, direct
  stdio, daemon HTTP/stdio bridging, and child-worker offload.
- The final affected constellation passes 16 files and 176 tests, including all
  47 emitted tool contracts, real SDK discovery and client validation,
  receipt byte accounting, summary/full diagnostics, policy refusals, API
  consumers, worker offload, workspace routing, and both stdio runtimes. Lint,
  typecheck and diff hygiene also pass. A later full-branch Code Lawyer review
  found compatibility and mutation-boundary defects that are recorded and
  repaired below.
- The first exact-commit run exposed two stale repository witnesses that focused
  tests had missed: an old receipt playback supplied an invalid `safe_read`
  body, and the generated backlog dependency graph omitted the newly filed
  on-demand-schema idea. The strict runtime validator correctly rejected the
  invalid fixture; both witnesses were repaired without weakening the product
  contract.
- The exact repair commit (`dccd2d13`) passes a clean detached Docker build,
  explicit image typecheck, and the full isolated suite: 249 files and 1,889
  tests with zero failures. The only child change before this witness was the
  generated SVG companion to the already-validated dependency-DAG source. That
  exact child (`2f6d843a`) changes only the SVG, passes the two relevant files
  and 15 tests from a clean detached worktree, and has a clean diff.

### Slice 5: capability discovery

- The new `capabilities` tool is registered in both runtimes, remains available
  before daemon workspace binding, and does not require repository-state
  observation. Repo-local discovery reports 34 registered tools; daemon
  discovery reports 48.
- Default discovery returns the seven fixed workflow families without per-tool
  descriptions. One explicit family returns only that family's tool names and
  capability-registry descriptions, with the opening call first and all
  remaining names in deterministic code-point order.
- Every registered MCP tool belongs to exactly one family. The fourteen
  daemon-only tools exactly match the daemon registry and are absent from
  repo-local detail. Contract tests compare the product taxonomy with the real
  shared, daemon-only, and combined runtime registries.
- Every result states `discoveryBasis: "registered_surface"`. Documentation and
  tests preserve the distinction between installed registration and current
  authorization: workspace binding, explicit routing, and capability policy
  may still obstruct a registered tool.
- Complete compact responses measure 1,393 bytes for repo-local summary and
  1,390 bytes for daemon summary. The largest repo-local family detail is 1,233
  bytes; the largest daemon detail is 2,111 bytes. All remain below the 2 KiB
  summary and 4 KiB detail contracts.
- With the 48th tool included, strict generated MCP schemas total 511,333
  bytes, with `doctor` largest at 67,291 bytes. Advertised discovery schemas
  total 52,446 bytes, with `doctor` largest at 3,114 bytes. `capabilities`
  contributes a 12,992-byte strict schema and a 2,118-byte discovery schema;
  the advertised surface remains below the 65,536-byte aggregate and
  8,192-byte per-tool budgets.
- The installed MCP SDK proves repo-local summary/detail invocation and unbound
  daemon detail invocation, strict output validation, bounded advertised
  schemas, and exact equality between structured content and compatibility JSON
  text. The affected compatibility sweep passes 43 files and 341 tests.
- The live-worktree full suite passed 250 files and 1,901 tests but correctly
  failed its dependency-DAG witness because an unrelated operator-owned
  untracked backlog card was present in the Docker build context. That result
  is recorded as contaminated rather than called green or repaired by absorbing
  the operator's work.
- The exact Slice 5 commit (`8af1aa3a`) passes a clean detached Docker build,
  image typecheck, image lint, diff hygiene, and the complete isolated suite:
  251 files and 1,902 tests with zero failures. An early local review missed
  issues later found by the complete pre-PR Code Lawyer pass; the independent
  affected-test sweep itself reported zero failures.

## Post-review repair witnesses

The complete pre-PR self-review found three P1, three P2, and one P4 issue. The
campaign repaired the concrete defects before publication:

| Finding | Repair commit | Executable witness |
| --- | --- | --- |
| Repeated transition identity could cycle the history graph | `5948e250` | A-to-B-to-A produces distinct occurrence IDs and an acyclic `follows` chain. |
| Snapshot deltas inherited stale Git evidence | `1e577e3a` | Checkout then ordinary edit persists null Git kind, refs, and created epoch. |
| Legacy WARP `identityId` failed strict responses | `3c9b0344` | Receipt-boundary `code_find` and ambiguous `code_show` cases accept the optional field. |
| Same-second baseline reflog looked fresh | `32137c12` | Unchanged baseline entries produce no transition; changed reflogs still do. |
| Diagnostic CLI v1 changed under its old version | `f74d212e` | Full generated schemas match frozen `origin/main@c3885dab` digests and nested payloads project exactly. |
| Edit response validation followed the file write | `4561d5a0` | Injected domain-contract failure leaves file bytes and edit observations unchanged. |
| Public agent-flow Markdown was inconsistent/incomplete | `7f73d011` | README, MCP, and setup flows use consistent steps and publish capability onboarding. |
| New context method was absent from guard fixtures | `34c42b7d` | Unit and playback construction-contract fixtures pass. |

At `34c42b7d`, typecheck, lint, branch diff hygiene, and the complete default
suite pass: 253 files and 1,910 tests. Broader two-phase semantics for daemon
control-plane mutations remain explicit follow-up in
`CLEAN_mutating-tools-need-prepared-response-contract.md`; the active campaign
does not represent that future work as already shipped.

## Slice and commit plan

1. `fix(mcp): distinguish baseline state from observed transitions`
2. `feat(mcp): default to compact response receipts`
3. `feat(mcp): make diagnostics summary-first`
4. `feat(mcp): expose bounded structured tool outputs`
5. `feat(mcp): expose compact capability discovery`
6. Retro, drift reconciliation, backlog follow-ups, and validation witness.

Each implementation slice remains a focused commit. The branch is pushed after
every commit. The local retro is completed, committed, and validated before any
pull request is opened.
