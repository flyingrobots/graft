---
title: "WARP graph ontology and causal collapse model"
legend: "WARP"
cycle: "0059-graph-ontology-and-causal-collapse-model"
source_backlog: "docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md"
---

# WARP graph ontology and causal collapse model

Source backlog item: `docs/method/backlog/asap/WARP_graph-ontology-and-causal-collapse-model.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Define the first honest WARP ontology for Graft so the repo can
distinguish structural truth, causal provenance, session/strand
identity, checkout epochs, and collapse semantics without churning the
implementation around unstable language.

## Playback Questions

### Human

- [ ] Can a human explain the difference between canonical structural
      truth and canonical provenance for the same staged or committed
      artifact?
- [ ] Is partial-stage causal slicing the default collapse model,
      rather than whole-session or whole-strand admission?
- [ ] Are branch switches, detached-head moves, merges, and rewrites
      explicit checkout-epoch boundaries instead of hidden state drift?

### Agent

- [ ] Is transport session no longer overloaded as the product session
      model?
- [ ] Are the first-class identities explicit enough to implement
      without churn:
      repo, worktree, checkout epoch, causal session, strand, event,
      staged target, commit, file, symbol?
- [ ] Is the event granularity explicit enough for causal-slice
      collapse instead of whole-tool-call replay?
- [ ] Is the dependency boundary explicit between local Graft design
      work and the upstream `git-warp v17.1.0+` substrate needed for
      full strand-aware collapse?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - keep the ontology layered and explicit:
    structural truth, canonical provenance, strand-local speculative
    history, workspace overlay / checkout epochs
  - define terms once and use them consistently instead of letting
    "session" or "worldline" float between meanings
- Non-visual or alternate-reading expectations:
  - collapse and provenance concepts must be explainable from bounded
    machine-readable artifacts, not only diagrams or long prose
  - human and agent consumers need concise causal summaries before any
    future rich UI treatment

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - internal graph terms remain machine-oriented English identifiers
  - user-facing explanations should prefer "why this changed" language
    over category-theory jargon by default
- Logical direction / layout assumptions:
  - no UI-specific layout assumptions in this cycle; the primary output
    is ontology and contract language

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - what a causal session is and is not
  - whether an event is structural truth, canonical provenance,
    strand-local speculation, or discardable noise
  - what collapse target and witness shape a later implementation must
    honor
- What must be attributable, evidenced, or governed:
  - actor identity for human / agent / Git-driven transitions
  - checkout-epoch boundaries
  - event footprints and causal edges
  - dependency boundary between local design and upstream `git-warp`
    support

## Non-goals

- [ ] Implement full strand-aware causal collapse before upstream
      `git-warp v17.1.0+` support exists.
- [ ] Pretend every transient read or search is canonical structural
      truth.
- [ ] Collapse whole sessions by default.
- [ ] Finalize rich symbol identity semantics in the same packet if
      file/event ontology is not yet stable.
- [ ] Invent a GUI-first product story before the ontology is real.

## Backlog Context

Define the first honest graph model for Graft's WARP future.

Problem:
- we now have the execution substrate for daemon scheduling, worker
  pools, writer lanes, and workspace slices
- we do not yet have an explicit ontology for what the Graft WARP graph
  is supposed to store
- without that ontology, persisted sub-commit history, provenance,
  strand lifecycle, and collapse semantics will churn each other

Current dependency posture:
- design should proceed now
- full implementation of strand-aware causal collapse is currently
  blocked on `git-warp` support expected in `v17.1.0+`
- until that lands, this packet should aim to settle ontology,
  identities, witnesses, and slice semantics so Graft is ready to wire
  the substrate in immediately after the upstream release

The mental model we need to design explicitly is:
- Graft models AST / structural truth as it evolves over time
- Graft also models the activity that explains why those structural
  changes happened
- sessions are not just transport sessions; they are strand-scoped
  causal workspaces
- commits and staged snapshots are collapse checkpoints
- collapse should admit a causal slice, not the entire strand

Questions to answer:
- what are the graph layers:
  - canonical structural truth
  - canonical provenance
  - strand-local speculative history
  - workspace overlay / checkout epochs
- what are the first-class identities:
  - repo
  - worktree
  - checkout epoch
  - session
  - strand
  - staged target
  - commit
  - file
  - symbol
  - event
- what event granularity is required for useful causal slicing:
  - read
  - write
  - edit
  - stage
  - commit
  - checkout / merge / rewrite transition
  - tool call versus file- or symbol-level events
- how does collapse work:
  - target footprint
  - causal cone / slice
  - witness
  - reintegration into canonical provenance and structural truth
- which facts are stored versus projected / derived
- what becomes durable provenance versus discardable noise

Deliverables:
- explicit node and edge vocabulary
- explicit split between structural truth and causal provenance
- explicit definition of session, strand, checkout epoch, and collapse
- explicit first slice boundaries for implementation
- explicit dependency boundary between what Graft can design locally now
  and what must wait for upstream `git-warp` support

Related:
- `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`
- `docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`

## Proposed ontology

### Layer 1: Canonical structural truth

This layer answers:

- what the repo meant structurally at a durable checkpoint
- what structural delta exists between durable checkpoints
- what later overlays or strands are based on

First-class node kinds:
- `repo`
- `commit`
- `file`
- `symbol`
- `structural_snapshot`
- `structural_delta`

First-class edges:
- `repo -> contains_commit -> commit`
- `commit -> has_structural_snapshot -> structural_snapshot`
- `structural_snapshot -> contains_file -> file`
- `file -> contains_symbol -> symbol`
- `commit -> evolves_to -> commit`
- `structural_delta -> from_commit -> commit`
- `structural_delta -> to_commit -> commit`
- `structural_delta -> affects_file -> file`
- `structural_delta -> affects_symbol -> symbol`

This is the closest layer to current WARP Level 1 truth. It is durable,
low-noise, and should not be polluted by every read or search.

### Layer 2: Checkout-epoch and workspace overlay truth

This layer answers:

- which live worktree state we were interpreting against
- what branch/checkout/rewrite boundary the live state belongs to
- what unstaged/staged overlay existed before any later collapse

First-class node kinds:
- `worktree`
- `checkout_epoch`
- `workspace_overlay`
- `staged_target`
- `git_transition`

First-class edges:
- `repo -> has_worktree -> worktree`
- `worktree -> entered_epoch -> checkout_epoch`
- `checkout_epoch -> overlays_commit -> commit`
- `workspace_overlay -> anchored_to -> checkout_epoch`
- `workspace_overlay -> touches_file -> file`
- `staged_target -> selected_from -> workspace_overlay`
- `git_transition -> starts_epoch -> checkout_epoch`
- `git_transition -> from_ref -> commit|symbolic_ref`
- `git_transition -> to_ref -> commit|symbolic_ref`

This layer is still repo truth, but it is not canonical durable history
in the Git sense. It is the live footing for later causal reasoning.

### Layer 3: Strand-local speculative history

This layer answers:

- what coherent line of work was underway between checkpoints
- which reads, writes, decisions, and handoffs happened in that line of
  work
- what actor and checkout footing each event belonged to

First-class node kinds:
- `causal_session`
- `strand`
- `actor`
- `event`
- `decision`
- `intent_checkpoint`
- `handoff`

First-class edges:
- `causal_session -> owns_strand -> strand`
- `strand -> anchored_to -> checkout_epoch`
- `strand -> has_event -> event`
- `event -> by_actor -> actor`
- `event -> in_session -> causal_session`
- `event -> in_strand -> strand`
- `event -> follows -> event`
- `decision -> refines -> intent_checkpoint`
- `handoff -> continues -> causal_session`

This is where "between-commit memory" lives. It can survive transport
reconnects and does not collapse just because an MCP socket closes.

### Layer 4: Canonical provenance

This layer answers:

- which subset of strand activity explains a staged target or later
  commit
- what witness proves the slice boundary
- how the admitted provenance reattaches to structural truth

First-class node kinds:
- `collapse_record`
- `causal_slice`
- `collapse_witness`
- `provenance_projection`

First-class edges:
- `collapse_record -> targets -> staged_target|commit`
- `collapse_record -> includes_slice -> causal_slice`
- `causal_slice -> includes_event -> event`
- `collapse_record -> witnessed_by -> collapse_witness`
- `provenance_projection -> explains -> structural_delta`
- `provenance_projection -> derived_from -> causal_slice`

This layer is durable and inspectable, but it is narrower than raw
strand history. It is the admitted explanation, not the full scratchpad.

## Identity model

### Repo and worktree identity

- `repoId` is keyed by Git common dir
- `worktreeId` is keyed by resolved worktree root
- one repo may have many worktrees
- canonical structural truth is repo-scoped, not worktree-scoped

### Checkout epoch identity

- `checkoutEpochId` is worktree-scoped
- it advances on explicit history-shaping Git transitions:
  checkout, merge, rebase/rewrite, detached-head move, equivalent hook
  or daemon-observed transition
- it is the footing for workspace overlays and strands

### Session identity

We need four distinct identities:

- `transportSessionId`
  What the daemon or MCP client uses for request routing.
- `workspaceSliceId`
  The current bind/rebind epoch for cache, budget, and per-bind
  execution state.
- `causalSessionId`
  The coherent line of work that may outlive reconnects.
- `strandId`
  A speculative lane inside a causal session, anchored to a checkout
  epoch.

These must not be collapsed into one overloaded `session` concept.

### Actor identity

The ontology needs an explicit `actor` model, even if the first version
is conservative.

Actor kinds:
- `human`
- `agent`
- `git`
- `daemon`
- `unknown`

Confidence belongs on actor attribution and evidence, not on the actor
kind itself.

### File and symbol identity

This cycle should commit to:

- `fileId` as repo-relative path under a repo/checkpoint context
- `symbolId` as a temporary, confidence-bearing identity
  derived from path + kind + stable name/range cues

This cycle should not pretend rename continuity is solved. It should
only define where stronger symbol identity plugs in later.

## Event model

### Required event granularity

Whole tool-call logging is not enough for causal slicing. The minimum
useful event model is:

- `read_event`
  - footprint: file or symbol read set
  - source layer: structural truth, workspace overlay, strand-local
    speculation
- `write_event`
  - footprint: file or symbol write set
  - origin: human/agent/git
- `decision_event`
  - task-intent shift, hypothesis shift, accepted/rejected alternative
- `stage_event`
  - staged target footprint at a point in time
- `commit_event`
  - hard Git checkpoint
- `transition_event`
  - checkout / merge / rewrite / detached-head move
- `handoff_event`
  - one actor attaches to or inherits a causal session

Tool-call receipts remain useful, but they are summaries over these
events, not the whole provenance model.

### Footprint model

Every provenance-capable event should be able to express a footprint in
one of these shapes:

- file set
- symbol set
- later: finer region or semantic footprint

This is what makes causal slicing possible for partial stage and later
symbol-targeted collapse.

## Actor, evidence, and confidence model

### Actor schema

Every provenance-capable event may reference one actor record.

Minimum actor fields:
- `actorId`
- `actorKind`
- `displayName?`
- `source`
- `authorityScope`

Initial actor kinds:
- `human`
- `agent`
- `git`
- `daemon`
- `unknown`

Initial authority scopes:
- `authoritative`
- `declared`
- `inferred`
- `mixed`

This is intentionally narrower than a future identity platform. It is
only enough to keep provenance honest.

### Evidence schema

Actor claims must be backed by explicit evidence records.

Minimum evidence fields:
- `evidenceId`
- `evidenceKind`
- `source`
- `capturedAt`
- `strength`
- `details`

Initial evidence kinds:
- `mcp_transport_binding`
- `workspace_authorization`
- `explicit_handoff`
- `git_hook_transition`
- `git_index_observation`
- `worktree_fs_observation`
- `writer_lane_identity`
- `explicit_user_declaration`
- `explicit_agent_declaration`
- `conflicting_actor_signal`

Initial strength values:
- `direct`
- `strong`
- `weak`
- `conflicted`

### Confidence rules

Confidence belongs on the attribution result for an event, not on the
actor alone.

Initial confidence values:
- `high`
- `medium`
- `low`
- `unknown`

Initial downgrade rules:
- `high`
  - direct, non-conflicting evidence ties the event to one actor
  - example: explicit agent-owned daemon session plus matching writer
    lane plus no competing actor evidence
- `medium`
  - strong but incomplete evidence points to one actor
  - example: isolated worktree plus matching session/writer identity but
    no explicit handoff or declaration
- `low`
  - only weak or circumstantial evidence exists
  - example: same worktree timing and event order suggest one actor, but
    another actor may also have been present
- `unknown`
  - no credible attribution evidence exists, or the evidence conflicts
    materially

Hard rule:
- no user-facing provenance surface may imply confidence higher than the
  supporting evidence allows

This is the trust contract behind
`WARP_provenance-attribution-instrumentation`.

## Concrete event schema

### Base event envelope

Every provenance-capable event should be representable as a base
envelope with one variant payload.

```json
{
  "eventId": "evt_...",
  "eventKind": "read|write|decision|stage|commit|transition|handoff",
  "repoId": "repo_...",
  "worktreeId": "worktree_...|null",
  "checkoutEpochId": "epoch_...|null",
  "workspaceOverlayId": "overlay_...|null",
  "transportSessionId": "transport_...|null",
  "workspaceSliceId": "slice_...|null",
  "causalSessionId": "causal_...|null",
  "strandId": "strand_...|null",
  "actorId": "actor_...|null",
  "confidence": "high|medium|low|unknown",
  "evidenceIds": ["evidence_..."],
  "footprint": {
    "paths": ["src/server.ts"],
    "symbols": [],
    "regions": []
  },
  "occurredAt": "2026-04-09T00:00:00.000Z",
  "payload": {}
}
```

Not every field is required for every event, but the schema has to make
room for them explicitly.

### Event variants

#### `read_event`

Required payload:
- `surface`
- `projection`
- `sourceLayer`
- `reason`

Example:

```json
{
  "eventKind": "read",
  "payload": {
    "surface": "safe_read",
    "projection": "outline",
    "sourceLayer": "workspace_overlay",
    "reason": "OUTLINE"
  }
}
```

#### `write_event`

Required payload:
- `surface`
- `writeKind`
- `beforeRef?`
- `afterRef?`

Initial `writeKind` values:
- `human_edit`
- `agent_edit`
- `git_generated`
- `stage_projection`

#### `decision_event`

Required payload:
- `decisionKind`
- `summary`

Initial `decisionKind` values:
- `task_intent`
- `hypothesis_shift`
- `accepted_alternative`
- `rejected_alternative`
- `checkpoint`

This is the schema hook for
`WARP_intent-and-decision-events`.

#### `stage_event`

Required payload:
- `targetId`
- `footprint`
- `selectionKind`

Initial `selectionKind` values:
- `full_file`
- `partial_file`
- `symbol_subset`

## Concrete staged-target schema

### Why staged targets need their own schema

A staged target is not just "the files currently in the index". It is a
selection boundary that later collapse and provenance views must be able
to point at deterministically.

That means a staged target needs to preserve:
- what was selected
- where it was selected from
- what checkout footing it was selected against
- what selection mode was used

Without that, later stage-explain or commit-explain surfaces cannot
distinguish:
- one staged file versus many staged files
- full-file admission versus partial-file admission
- a staged target chosen under one checkout epoch versus a later one

### Minimum staged-target envelope

```json
{
  "targetId": "target_...",
  "targetKind": "staged_target",
  "repoId": "repo_...",
  "worktreeId": "worktree_...",
  "checkoutEpochId": "epoch_...",
  "workspaceOverlayId": "overlay_...",
  "selectedAt": "2026-04-09T00:00:00.000Z",
  "selectionKind": "full_file|partial_file|symbol_subset",
  "selectionEntries": [
    {
      "path": "src/server.ts",
      "symbols": [],
      "regions": []
    }
  ],
  "base": {
    "headCommitSha": "abc123",
    "indexTreeSha": null
  }
}
```

### Selection-entry rules

Each `selectionEntries` item represents one admitted footprint unit.

Minimum rules:
- `path` is always required
- `symbols` is optional and may be empty in the first implementation
- `regions` is optional and may be empty until region-granular collapse
  is supported
- `selectionKind = full_file`
  - `regions` should be empty
- `selectionKind = partial_file`
  - at least one region should be present once region slicing is
    implemented
- `selectionKind = symbol_subset`
  - at least one symbol identifier should be present

### Target identity rules

A `targetId` must be stable for the specific selection snapshot it
represents, not just for a path name.

The first honest identity boundary is:
- repo
- worktree
- checkout epoch
- overlay
- normalized selection footprint

If any of those change materially, the target is a new target rather
than a mutated view of the old one.

#### `commit_event`

Required payload:
- `commitSha`
- `parentShas`
- `message`

#### `transition_event`

Required payload:
- `transitionKind`
- `fromRef`
- `toRef`
- `createdCheckoutEpochId`

Initial `transitionKind` values:
- `checkout`
- `merge`
- `rewrite`
- `detached_head`

#### `handoff_event`

Required payload:
- `handoffKind`
- `fromActorId?`
- `toActorId?`
- `notes?`

Initial `handoffKind` values:
- `attach`
- `resume`
- `fork`
- `park`

## Collapse witness schema

### Minimum witness envelope

```json
{
  "collapseRecordId": "collapse_...",
  "targetKind": "staged_target|commit",
  "targetId": "target_...",
  "targetFootprint": {
    "paths": ["src/server.ts"],
    "symbols": [],
    "regions": []
  },
  "base": {
    "repoId": "repo_...",
    "checkoutEpochId": "epoch_...",
    "commitSha": "abc123"
  },
  "causalSessionId": "causal_...",
  "strandIds": ["strand_..."],
  "includedEventIds": ["evt_1", "evt_2"],
  "sharedEventIds": ["evt_shared"],
  "excludedBoundaries": [
    {
      "afterEventId": "evt_9",
      "reason": "outside_target_footprint"
    }
  ],
  "evidenceIds": ["evidence_1"],
  "confidence": "medium",
  "createdAt": "2026-04-09T00:00:00.000Z"
}
```

### Witness obligations

Every collapse witness must make these things recoverable:
- what target was admitted
- what structural footing it was admitted against
- which events were included
- which nearby boundaries were intentionally excluded
- what evidence justified the attribution and confidence level

### Boundary rules

The witness must also make the slice boundary testable.

Minimum rules:
- every included event must satisfy at least one of:
  - direct footprint overlap with the target
  - decision or handoff evidence explicitly referenced by another
    included event
  - structural-footing transition required to interpret the included
    events
- every shared event must be legal to appear in more than one collapse
  witness without changing its identity
- every excluded boundary must name a reason that is narrower than "not
  selected"

Initial exclusion reasons:
- `outside_target_footprint`
- `different_checkout_epoch`
- `different_causal_session`
- `insufficient_evidence`
- `precedes_selection_boundary`

These rules are what make stage-explain or commit-explain surfaces
reviewable instead of rhetorical.

This witness is the minimum durable explanation for
`WARP_causal-blame-for-staged-artifacts`.

## Admissibility rules

The ontology should distinguish four persistence classes:

- `canonical_structural_truth`
  - structural snapshots and deltas, commits, durable symbol/file state
- `canonical_provenance`
  - admitted collapse records, collapse witnesses, included events
- `strand_local`
  - speculative events and decisions not yet admitted
- `discardable`
  - raw execution noise that does not earn provenance value

Initial leaning:
- reads and writes that participate in an admitted slice may become
  canonical provenance
- decision and handoff events may become canonical provenance if they
  explain the admitted target
- execution-only metrics, worker occupancy, and similar runtime details
  remain projections or discardable artifacts, not graph truth

## Open questions deliberately deferred

This cycle should leave these open rather than pretending they are
solved:

- how far symbol identity can be trusted across rename/move/refactor
- whether one causal session may own several concurrent strands in the
  first implementation tranche
- how braid-level or optic-level upstream `git-warp` semantics will
  encode collapse and reintegration internally
- whether region-level footprints are needed before file- and symbol-
  level collapse is real

## Collapse model

### Default collapse target

The default collapse target is:

- a staged file set
- and later, a staged symbol or finer semantic footprint when the
  identity model is strong enough

Commits are collapse checkpoints, but staged targets are the more useful
human-and-agent unit for inspecting "what am I about to admit?"

### Default collapse rule

Collapse is slice-based by default:

- project the target footprint
- compute the backward causal slice from strand-local events and
  overlay/structural footing
- create a `collapse_record`
- admit only the relevant provenance into canonical provenance
- leave raw strand history intact

Whole-session or whole-strand collapse is not the default and should be
treated as an explicit exceptional mode if ever supported.

### Collapse witness shape

The minimum witness needs to say:

- `target`
  - staged target or commit target
- `base`
  - checkout epoch and structural footing
- `includedEvents`
  - stable ids for the events admitted into the slice
- `sharedEvents`
  - events that may also appear in another collapse projection
- `excludedReason`
  - optional boundary explanations for why nearby events were left out
- `confidence`
  - how strong the causal slice is, given footprint and identity
    quality

This witness is the contract Graft can design now, even before full
strand-aware storage lands upstream.

## Stored truth versus derived projections

Should be stored as graph truth:

- commits, repo/worktree identity, checkout epochs
- strands and causal-session membership
- events with actor, footprint, and ordering
- collapse records and witnesses

Should be projections over stored truth:

- receipts
- stage-explain views
- stage/commit causal blame
- IDE surfaces
- Git-enhancement surfaces
- replay narratives

This keeps the ontology small and the user-facing surfaces flexible.

## Upstream dependency boundary

### What Graft can settle locally now

- layer boundaries
- identity vocabulary
- event kinds and minimum footprint shape
- collapse target and witness contract
- session/strand/checkout-epoch terminology
- what counts as canonical provenance versus structural truth

### What is blocked on `git-warp v17.1.0+`

- full strand-aware storage and replay semantics in the upstream
  substrate
- lawful persistence and reintegration for slice-based collapse
- any implementation that depends on upstream strand/collapse behavior
  rather than local design language

This packet should therefore end with an implementation-ready contract,
not a fake completed collapse engine.

## First implementation boundaries after this cycle

When `git-warp v17.1.0+` is available, the first honest tranche should
be:

1. split transport/session naming in code
2. introduce explicit checkout-epoch ids and transitions in runtime
   state
3. emit provenance-capable event shapes with file footprints
4. persist strand-local history across reconnects
5. add staged-target collapse witness generation before full canonical
   reintegration

Only after that should we attempt richer symbol-scoped collapse,
counterfactuals, or heavy IDE surfaces.

## Design leaning

- Graft is a coupled structural + causal system, not just AST history
  and not just event logging
- the core unit of ongoing work is a causal session with one or more
  strands, not an MCP socket
- staged targets are the most useful default human/agent collapse unit
- canonical provenance should be durable and inspectable, but always
  narrower than raw strand history
- collapse is best understood as a witness-bearing projection and
  reintegration step, not a destructive move or full-session flattening

Effort: XL
