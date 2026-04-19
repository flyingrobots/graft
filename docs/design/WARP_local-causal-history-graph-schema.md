---
title: "Local causal history graph schema"
legend: "WARP"
cycle: "WARP_local-causal-history-graph-schema"
source_backlog: "docs/method/backlog/asap/WARP_local-causal-history-graph-schema.md"
---

# Local causal history graph schema

Source backlog item: `docs/method/backlog/asap/WARP_local-causal-history-graph-schema.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

These labels are abstract roles. In this design, `user` means the served
perspective, like in a user story, not a literal named person or
specific agent instance.

## Hill

Define the first formal git-warp graph schema for Graft's local causal
history so the repo can move persisted local history out of
`.graft/local-history/*.json` and into the same graph substrate that
already carries structural AST evolution.

The schema must be explicit enough that:

- implementation does not invent node kinds ad hoc
- current JSON continuity records and causal events map into one graph
  model instead of a second bespoke store
- append-only history remains the source of truth and "current state"
  is derived rather than persisted as mutable sidecar state
- persisted local history remains `artifact_history` until a later
  collapse witness admits a slice into canonical provenance

## Playback Questions

### Human

- [ ] Can a human explain which identities are first-class in local
      causal history:
      repo, worktree, checkout epoch, causal session, strand,
      workspace slice, actor, event, footprint, staged target?
- [ ] Can a human explain how `start`, `attach`, `resume`, `fork`, and
      `park` become graph events rather than JSON bookkeeping?
- [ ] Is it explicit which current `.graft` persistence is meant to
      disappear under this model?
- [ ] Does the packet keep local causal history as `artifact_history`
      rather than overclaiming canonical provenance?

### Agent

- [ ] Are node IDs, node families, edge labels, and required properties
      explicit enough to implement without guessing?
- [ ] Can the current `ContinuityRecord`, `CausalEvent`, evidence, and
      attribution contracts map into this graph without a second schema?
- [ ] Is active-strand / active-session state clearly derived from graph
      traversal rather than mutable stored pointers such as
      `activeRecordId`?
- [ ] Is the boundary explicit between local-history storage that Graft
      can implement now and later collapse/admission machinery that may
      still depend on upstream `git-warp` evolution?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - one graph, two major domains:
    structural truth and local causal history
  - one node family at a time
  - one set of append-only invariants
- Non-visual or alternate-reading expectations:
  - the schema must stand on its own in plain text
  - no diagram-only semantics
  - every required field and edge label must be machine-readable and
    prose-readable

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - internal identifiers remain ASCII and machine-oriented English
  - user-facing explanations may later soften the terms, but the graph
    schema should not
- Logical direction / layout assumptions:
  - edge direction is semantically meaningful and must be stated
    explicitly
  - no UI-specific layout assumptions are part of this packet

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - which local-history facts become first-class nodes
  - which current JSON fields become node properties versus derived
    projections
  - how local-history nodes connect to existing structural nodes
  - which state is append-only and which state is derived
- What must be attributable, evidenced, or governed:
  - every provenance-capable event must point at one actor attribution
    result plus explicit evidence records
  - every causal event that claims a footprint must carry or link a
    causal footprint object
  - every strand must be anchored to one checkout epoch
  - every later collapse surface must be able to slice these nodes
    without mutating the raw event history

## Non-goals

- [ ] Redesign the existing commit-level AST worldline schema in the
      same packet.
- [ ] Solve full braid-local collapse or canonical provenance admission
      in the same packet.
- [ ] Move user-authored repo config such as `.graftignore` into the
      graph.
- [ ] Preserve `ContinuityState` JSON as the long-term source of truth.
- [ ] Treat transport/runtime scratch as first-class causal history just
      because it exists.

## Backlog Context

Formalize the git-warp graph schema for Graft's local causal history
model.

Why:
- `0060` defined continuity, lifecycle, and bounded surfaces, but not
  the actual graph node and edge schema needed to store local history
  in WARP
- current persisted local history still lives as
  `.graft/local-history/*.json`, which is now explicit architectural
  debt
- implementation should not improvise graph structure ad hoc
- the repo has already settled the stronger doctrine that persisted
  repo-internal state belongs in the git-warp graph rather than hidden
  worktree sidecars

Deliverable direction:
- define node families and edge families for local causal history in
  git-warp
- specify required fields, identities, and invariants
- map current JSON continuity records and causal events onto the graph
  model
- make explicit how local-history nodes connect to the existing
  structural worldline

## Problem framing

The repo is already using `@git-stunts/git-warp` for one half of its
memory model:

- structural AST evolution over time

It is not yet using it for the second half:

- local causal history between commits

That split is now a doctrine bug, not just an implementation shortcut.
The same graph substrate should carry:

- structural meaning over commits
- local causal activity between commits

If local history stays in JSON sidecars:

- it has weaker history semantics than the graph
- "current" state is persisted as file bookkeeping instead of derived
  from append-only causal facts
- the repo keeps paying `.graft` exclusion / ignore complexity for state
  that should instead be invisible to normal Git

## Design goals

1. One repo-local git-warp graph, not separate stores for structural
   truth and local causal history.
2. Append-only local-history facts. "Current" status is a query
   projection, not a mutable persisted pointer.
3. Maximal reuse of current contract language from
   `src/contracts/causal-ontology.ts` rather than inventing a second
   vocabulary.
4. Direct cross-links from local-history footprints to structural file
   and symbol nodes where possible.
5. Local causal history remains `artifact_history` until later collapse.
6. The schema composes with `git-warp`'s actual substrate surfaces:
   worldlines, strands, comparison/braid surfaces, provenance, and
   bounded observer reads. It must not invent a parallel storage or read
   model beside them.

## WARP-native alignment

This packet defines a graph schema stored inside the repo-local
`git-warp` graph. It does not replace `git-warp`'s own control nouns.

The important split is:

- WARP substrate nouns:
  - `worldline`
  - `strand`
  - `braid`
  - `observer`
  - commitment / folding / revelation / governance surfaces
- Graft application-level graph entities stored inside that substrate:
  - `checkout_epoch`
  - `causal_session`
  - `workspace_slice`
  - `workspace_overlay`
  - `local_history_event`
  - `causal_footprint`
  - `staged_target`

Rules:

- local-history facts are written through WARP commitment surfaces,
  not through sidecar files or an out-of-band state store
- bounded human/agent inspection should read through WARP-style
  revelation surfaces, not through ungoverned raw graph dumps
- any Graft-local identity that shares a name with a WARP substrate noun
  must be explicitly treated as an application-level graph fact that
  aligns with the substrate object, not a replacement for it

Concretely:

- the graph continues to have one repo-local substrate, currently the
  same graph Graft already uses for structural truth
- Graft may persist application metadata about a line of work as a
  `strand`-family node in the graph, but that node is not a second
  implementation of `git-warp`'s own strand descriptor machinery
- later braid / comparison work should reconcile divergent local-history
  lanes through WARP comparison and admission machinery rather than by
  inventing a separate merge model inside Graft

## Proposed schema

### Placement and namespace

Local causal history lives in the same repo-local git-warp graph as the
structural worldline.

Schema rule:
- one graph per repo
- no second "local history graph"
- no filesystem JSON source of truth for persisted local history

ID rule:
- shared structural roots may use shared IDs such as `repo:<repoId>` and
  `worktree:<worktreeId>`
- local-history-specific nodes use the `lh:` prefix to avoid collision
  with existing structural IDs

Examples:
- `repo:<repoId>`
- `worktree:<worktreeId>`
- `lh:epoch:<checkoutEpochId>`
- `lh:session:<causalSessionId>`
- `lh:strand:<strandId>`
- `lh:slice:<workspaceSliceId>`
- `lh:event:<eventId>`
- `lh:actor:<actorId>`
- `lh:evidence:<evidenceId>`
- `lh:footprint:<digest>`
- `lh:region:<digest>`
- `lh:overlay:<workspaceOverlayId>`
- `lh:target:<targetId>`

Property rule:
- local-history nodes use `entityKind` for node family identity
- event subtype uses `eventKind`
- continuity subtype uses `continuityOperation`

This avoids colliding with existing structural symbol property names
such as `kind`.

### Node families

These are application-level node families stored in the shared WARP
graph. They complement the substrate's own worldline / strand /
observer machinery; they do not replace it.

#### Shared anchor nodes

`repo`
- Node id: `repo:<repoId>`
- Required properties:
  - `entityKind = "repo"`
  - `repoId`

`worktree`
- Node id: `worktree:<worktreeId>`
- Required properties:
  - `entityKind = "worktree"`
  - `repoId`
  - `worktreeId`
  - `worktreeRoot`

These nodes are shared anchors between structural truth and local
causal history.

#### Local-history identity nodes

`checkout_epoch`
- Node id: `lh:epoch:<checkoutEpochId>`
- Required properties:
  - `entityKind = "checkout_epoch"`
  - `repoId`
  - `worktreeId`
  - `checkoutEpochId`
  - `openedAt`
- Optional properties:
  - `headRef`
  - `headSha`
  - `transitionKind`
  - `transitionReflogSubject`
  - `hookTransitionName`
  - `hookTransitionObservedAt`

`causal_session`
- Node id: `lh:session:<causalSessionId>`
- Required properties:
  - `entityKind = "causal_session"`
  - `repoId`
  - `causalSessionId`
  - `persistenceClass = "artifact_history"`
  - `startedAt`

`strand`
- Node id: `lh:strand:<strandId>`
- Required properties:
  - `entityKind = "strand"`
  - `repoId`
  - `causalSessionId`
  - `strandId`
  - `originCheckoutEpochId`
  - `createdAt`

This node family records Graft's graph-visible identity for a local line
of work. It must align with the underlying `git-warp` strand identifier
and lifecycle, but it is not a second strand runtime.

`workspace_slice`
- Node id: `lh:slice:<workspaceSliceId>`
- Required properties:
  - `entityKind = "workspace_slice"`
  - `repoId`
  - `worktreeId`
  - `workspaceSliceId`
  - `transportSessionId`
  - `openedAt`
- Optional properties:
  - `causalSessionId`
  - `checkoutEpochId`

`actor`
- Node id: `lh:actor:<actorId>`
- Required properties:
  - `entityKind = "actor"`
  - all fields from `actorSchema`:
    - `actorId`
    - `actorKind`
    - `source`
    - `authorityScope`
- Optional properties:
  - `displayName`

`workspace_overlay`
- Node id: `lh:overlay:<workspaceOverlayId>`
- Required properties:
  - `entityKind = "workspace_overlay"`
  - `repoId`
  - `worktreeId`
  - `checkoutEpochId`
  - `workspaceOverlayId`
  - `observedAt`

`staged_target`
- Node id: `lh:target:<targetId>`
- Required properties:
  - `entityKind = "staged_target"`
  - `repoId`
  - `targetId`
  - `selectionKind`
  - `checkoutEpochId`
  - `observedAt`

#### Supporting payload nodes

`evidence`
- Node id: `lh:evidence:<evidenceId>`
- Required properties:
  - `entityKind = "evidence"`
  - all fields from `evidenceSchema`:
    - `evidenceId`
    - `evidenceKind`
    - `source`
    - `capturedAt`
    - `strength`
    - `details`

`causal_footprint`
- Node id: `lh:footprint:<digest>`
- Required properties:
  - `entityKind = "causal_footprint"`
  - `footprintDigest`
  - `paths`
  - `symbols`
- Optional properties:
  - `shape = "file_set" | "symbol_set" | "region_set" | "mixed"`

`causal_region`
- Node id: `lh:region:<digest>`
- Required properties:
  - `entityKind = "causal_region"`
  - fields from `causalRegionSchema`

#### Event nodes

Every persisted local-history event is a node of family
`local_history_event`.

Node id:
- `lh:event:<eventId>`

Required common properties:
- `entityKind = "local_history_event"`
- `eventId`
- `eventKind`
- `repoId`
- `occurredAt`
- `persistenceClass = "artifact_history"`
- `attributionConfidence`
- `attributionBasis`

Optional common properties:
- `worktreeId`
- `checkoutEpochId`
- `workspaceOverlayId`
- `transportSessionId`
- `workspaceSliceId`
- `causalSessionId`
- `strandId`
- `actorId`

Event kinds:
- `continuity`
- `read`
- `write`
- `decision`
- `stage`
- `commit`
- `transition`
- `handoff`

`continuity` event required subtype properties:
- `continuityOperation`
- `continuedFromEventId?`
- `continuedFromCausalSessionId?`
- `continuedFromStrandId?`

`read` event required subtype properties:
- `surface`
- `projection`
- `sourceLayer`
- `reason`

`write` event required subtype properties:
- `surface`
- `writeKind`
- `beforeRef?`
- `afterRef?`

`decision` event required subtype properties:
- `decisionKind`
- `summary`

`stage` event required subtype properties:
- `targetId`
- `selectionKind`

`commit` event required subtype properties:
- `commitSha`
- `parentShas`
- `message`

`transition` event required subtype properties:
- `semanticKind`
- `authority`
- `summary`
- `phase?`
- `transitionKind?`
- `fromRef?`
- `toRef?`
- `createdCheckoutEpochId?`

`handoff` event required subtype properties:
- `handoffKind`
- `fromActorId?`
- `toActorId?`
- `notes?`

### Edge families

#### Identity and anchoring edges

- `repo -has_worktree-> worktree`
- `worktree -entered_epoch-> checkout_epoch`
- `repo -has_causal_session-> causal_session`
- `causal_session -owns_strand-> strand`
- `causal_session -has_workspace_slice-> workspace_slice`
- `strand -anchored_to-> checkout_epoch`
- `workspace_slice -bound_to-> worktree`
- `workspace_slice -opened_at_epoch-> checkout_epoch`
- `workspace_overlay -anchored_to-> checkout_epoch`
- `staged_target -selected_from-> workspace_overlay`

#### Event attachment edges

- `local_history_event -in_session-> causal_session`
- `local_history_event -in_strand-> strand`
- `local_history_event -in_worktree-> worktree`
- `local_history_event -in_checkout_epoch-> checkout_epoch`
- `local_history_event -in_workspace_slice-> workspace_slice`
- `local_history_event -attributed_to-> actor`
- `local_history_event -supported_by-> evidence`
- `local_history_event -has_footprint-> causal_footprint`
- `causal_footprint -has_region-> causal_region`

#### Temporal and continuity edges

`follows`
- Direction: later event `->` immediately previous event in the same
  strand
- Purpose: reconstruct append-only strand-local order without mutable
  head pointers

`continues_from`
- Direction: continuity event `->` prior continuity or event boundary
  that it lawfully resumes, attaches to, or forks from
- Purpose: preserve explicit continuity lineage across reconnects and
  branch-footing changes

`creates_strand`
- Direction: continuity event `->` strand
- Required for `start` and `fork`

`parks_strand`
- Direction: continuity event `->` strand
- Required for `park`

`captures_target`
- Direction: stage event `->` staged_target

`creates_epoch`
- Direction: transition event `->` checkout_epoch
- Used when a transition introduces a new checkout epoch boundary

#### Cross-domain edges into structural truth

These are the point of using the same graph rather than a separate
sidecar store.

- `checkout_epoch -overlays_commit-> commit`
- `causal_footprint -references_file-> file`
- `causal_footprint -references_symbol-> symbol`
- `workspace_overlay -touches_file-> file`
- `staged_target -targets_file-> file`
- `staged_target -targets_symbol-> symbol`
- `local_history_event (eventKind = "transition") -from_commit-> commit`
  when resolvable
- `local_history_event (eventKind = "transition") -to_commit-> commit`
  when resolvable

Raw refs such as `fromRef` / `toRef` must still be kept as properties
even when commit resolution succeeds.

## Invariants

1. Local causal history is append-only.
   - event nodes are never rewritten in place
   - active state is derived from traversal

2. Persisted local history remains `artifact_history`.
   - these nodes are not canonical provenance by default
   - later collapse may admit a slice without mutating raw local
     history

3. Every strand anchors to exactly one checkout epoch.
   - a strand may not silently smear across epoch boundaries
   - crossing an epoch boundary requires an explicit `fork` / `park`
     story

4. `ContinuityState` is projection, not ontology.
   - no `continuity_state` node family
   - no persisted `activeRecordId` field as source of truth

5. Attribution confidence is bounded by evidence.
   - the graph stores evidence nodes explicitly
   - event confidence may not outrun that evidence

6. User-authored config is out of scope.
   - files such as `.graftignore` are repo content
   - they are not local-history persistence artifacts

## Mapping from the current JSON model

Current file-backed model:
- `ContinuityState`
  - `records`
  - `readEvents`
  - `stageEvents`
  - `transitionEvents`
  - `activeRecordId`

Graph-backed mapping:

`ContinuityState`
- Becomes: no durable node
- Role after migration: query projection only

`ContinuityRecord`
- Becomes: `local_history_event` with `eventKind = "continuity"`
- `recordId` becomes `eventId`
- `operation` becomes `continuityOperation`

`readEvents[]`, `stageEvents[]`, `transitionEvents[]`
- Become: `local_history_event` nodes with matching `eventKind`

`activeRecordId`
- Becomes: derived query result
- Never stored as durable graph truth

`continuityEvidence` and event `evidenceIds`
- Become: `evidence` nodes plus `supported_by` edges

`attribution`
- Becomes:
  - `attributed_to` edge to `actor`
  - `attributionConfidence` property on the event
  - `attributionBasis` property on the event
  - current event `confidence` field maps to
    `attributionConfidence`
  - current event `attribution.basis` field maps to
    `attributionBasis`

`transition` payload
- Becomes:
  - `semanticKind`
  - `authority`
  - `phase`
  - `transitionKind`
  - `fromRef`
  - `toRef`
  - `createdCheckoutEpochId`

`footprint`
- Becomes:
  - `causal_footprint` node
  - optional `causal_region` children
  - direct structural cross-links to `file` / `symbol` nodes

`historyPath`
- Becomes: nothing
- It only existed because the current model stores JSON sidecars

## First implementation slices

### Slice 1: contract and graph writer

- add graph-writer helpers for the node and edge families above
- introduce a formal `continuity` event shape in code so continuity
  records and causal events share one event model
- dual-write local-history updates through WARP commitment surfaces
  while preserving the current JSON path temporarily
- keep graph writes on the existing repo-local substrate rather than
  opening a second graph or second persistence channel

### Slice 2: graph-backed readers

- teach `causal_status`, `activity_view`, and related surfaces to reveal
  local-history truth from the graph instead of JSON state files
- make active-strand / active-session projections traversal-based
- keep those reads aligned with WARP revelation / provenance posture
  instead of exposing an unbounded raw graph scan as the product surface

### Slice 3: JSON retirement

- remove `.graft/local-history/*.json` as a source of truth
- keep migration tooling only as long as necessary to read old state
- delete the file-backed persistence seam once graph-backed reads are
  stable

## Upstream dependency boundary

### What Graft can settle locally now

- the local-history node and edge schema
- graph-backed storage of local causal history on the existing WARP
  substrate
- append-only traversal semantics for active state
- migration away from JSON sidecars
- cross-links from local-history footprints to structural file/symbol
  nodes
- application-level identities that align with WARP worldline / strand /
  provenance surfaces without replacing them

### What may still depend on later upstream work

- richer multi-lane admission and braid-native collapse mechanics
- upstream-native collapse/admission helpers beyond raw graph storage
- higher-order provenance packaging once collapse moves from design law
  to graph-native admission machinery

The storage model for local causal history is not blocked. The broader
collapse model may still be.

## Delivery posture

This packet exists to remove one specific ambiguity:

Graft already knows that local causal history belongs in WARP. What it
did not know yet was the exact graph shape.

After this packet, implementation should be able to move from
`.graft/local-history/*.json` to graph-backed local history without
inventing ontology mid-flight.
