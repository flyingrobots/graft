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
  human rendering contracts do not change in this slice.

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
- The response names the canonical opening call and one-line next-step guidance
  for each family without dumping every internal capability field.
- Family detail is bounded, deterministically ordered, and selected explicitly.
- Existing MCP tool names and CLI commands are not renamed or removed.
- The projection is derived from or checked against the authoritative
  capability registry so it cannot silently advertise missing tools.

## Playback questions

### Human

- [x] Does opening a repository with hundreds of pre-existing untracked files
      describe a baseline rather than invented movement?
- [ ] Can I request the old full receipt and full diagnostic views explicitly?
- [ ] Is the default doctor result small enough to use at every session start?
- [ ] Can an MCP client discover and validate Graft's output shape without a
      Graft-specific schema fetch or reverse-engineering response prose?
- [ ] Can I discover the intended Graft workflow without reading the full MCP
      registry?

### Agent

- [x] Is a normal precision-read receipt below 512 encoded bytes while retaining
      a stable evidence identifier and exact returned-byte count?
- [x] Does `stats` still expose cumulative burden after compact calls?
- [ ] Does default `doctor` name health, workspace, readiness, degradation, and
      exactly one next action in less than 2 KiB?
- [ ] Does default `activity_view` omit event bodies while retaining bounded
      counts, truncation truth, and group summaries?
- [ ] Can `receipt: "full"` and `detail: "full"` reproduce the explicit audit
      surfaces needed by compatibility clients?
- [ ] Does every successful tool call expose one semantically identical value
      through MCP structured content and compatibility JSON text?
- [ ] Does native output discovery stay bounded instead of adding the complete
      internal audit schema to every tool definition?
- [ ] Does capability discovery recommend only registered, callable tools?

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
  publication surface; non-MCP schema distribution can be justified separately.
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
   strict and advertised validation, text/structured equivalence, and aggregate
   and per-tool schema budgets.
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
