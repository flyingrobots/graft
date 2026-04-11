---
title: "Persisted sub-commit local history"
legend: "WARP"
cycle: "0060-persisted-sub-commit-local-history"
source_backlog: "docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md"
---

# Persisted sub-commit local history

Source backlog item: `docs/method/backlog/up-next/WARP_persisted-sub-commit-local-history.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Define the first honest persisted local-history model for Graft so
meaningful between-commit activity can survive across reconnects and
checkout-aware session continuity without pretending that persisted
artifact history is either Git history or admitted canonical
provenance.

## Playback Questions

### Human

- [ ] Can a human explain what persisted local history is, how it
      differs from Git commit history, and how it differs from admitted
      canonical provenance?
- [ ] Does reconnecting an agent or handing work to another actor
      preserve one coherent line of work when lawful, instead of
      forcing a fake fresh start?
- [ ] Are branch switches, merges, rewrites, and detached-head moves
      explicit continuity boundaries that park, fork, or re-anchor
      local history instead of smearing it?
- [ ] Can a human inspect persisted local history through bounded
      machine-readable surfaces rather than raw append-only logs or
      chat transcripts?

### Agent

- [ ] Is persisted local history anchored to causal sessions, strands,
      and checkout epochs instead of transport-session lifetime?
- [ ] Are the persistence classes explicit enough to implement without
      churn:
      transient runtime residue, persisted local artifact history,
      admitted canonical provenance, canonical structural truth?
- [ ] Are attach, resume, fork, and park semantics explicit enough for
      agents to reason about continuity across reconnects and handoff?
- [ ] Is the dependency boundary explicit between what Graft can
      persist locally now and what remains blocked on upstream
      `git-warp v17.1.0+` collapse support?
- [ ] Is the bounded surface explicit about what evidence it preserves,
      what it excludes, and what action a human or agent should take
      next?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - explain persisted local history as a bounded artifact-history layer
    between transport/runtime noise and canonical provenance
  - prefer explicit lifecycle terms:
    attach, resume, fork, park, collapse
  - keep the continuity model machine-readable and text-recoverable
    without requiring timelines or graphics
- Non-visual or alternate-reading expectations:
  - persisted local history must be inspectable through bounded JSON and
    short textual summaries
  - a human or agent should be able to answer "what line of work is
    still alive?" without replaying an entire transcript

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - user-facing explanations should say "between-commit history" and
    "why this change happened" before using terms like strand or
    collapse
  - "attach/resume/fork/park" must be treated as stable product terms
    if adopted
- Logical direction / layout assumptions:
  - no timeline-visual assumptions in this cycle
  - continuity and boundary semantics must survive as ordered events and
    explicit IDs in linear text

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - whether the current line of work is fresh, attached, resumed,
    forked, or parked
  - which persisted local-history records belong to which causal
    session, strand, and checkout epoch
  - whether a record is still only `artifact_history` or has been
    admitted into `canonical_provenance`
  - what surfaces are inspectable now versus still blocked on upstream
    collapse support
- What must be attributable, evidenced, or governed:
  - actor identity and handoff evidence for continuity decisions
  - checkout-epoch boundaries for park/fork behavior
  - bounded event footprints for any record that may later participate
    in collapse
  - persistence and discard rules for runtime residue versus meaningful
    local history

## Non-goals

- [ ] Implement full strand-aware causal collapse before upstream
      `git-warp v17.1.0+` support exists.
- [ ] Treat persisted local history as if it were Git commit history.
- [ ] Persist raw chat transcripts or arbitrary daemon logs as product
      truth.
- [ ] Persist every tool call by default without bounded-footprint or
      inspectability rules.
- [ ] Solve symbol rename continuity in this same cycle.

## Backlog Context

Record meaningful local structural activity between commits without
pretending those events are the same as durable git history.

Scope:
- preserve workspace-overlay history across sessions
- decide what earns persistence versus what remains transient noise
- define the relationship between persisted local history and later
  commits
- keep the storage model inspectable and honest

Why separate cycle:
- this changes the effective product memory model, not just the event
  detector

Effort: XL

Related:
- `docs/design/0059-graph-ontology-and-causal-collapse-model/graph-ontology-and-causal-collapse-model.md`
- `docs/method/backlog/up-next/WARP_provenance-attribution-instrumentation.md`
- `docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`
- `docs/method/backlog/cool-ideas/SURFACE_attach-to-existing-causal-session.md`
- `docs/method/backlog/cool-ideas/SURFACE_active-causal-workspace-status.md`
- `docs/method/backlog/cool-ideas/WARP_causal-blame-for-staged-artifacts.md`

## Problem framing

`0059` settled the ontology, but not the durability model.

Right now Graft has:
- canonical structural truth over commits
- runtime-local causal footing
- runtime-local staged-target snapshots

What it does not yet have is a truthful answer to:

- what survives when the MCP transport reconnects
- what survives when one agent hands work to another
- what survives when the worktree moves to a new checkout epoch
- what should remain inspectable as local history even before any later
  collapse into canonical provenance

If this stays implicit, Graft will either:
- throw away the between-commit meaning that makes the product
  interesting, or
- over-persist runtime noise and call it history

## Proposed model

### Persistence layers

This cycle introduces one new durable layer between runtime residue and
canonical provenance:

1. `runtime_residue`
   - in-memory transport/session bookkeeping
   - budgets, caches, ephemeral queue state
   - may be discarded without losing product history

2. `persisted_local_history`
   - durable, inspectable, bounded `artifact_history`
   - survives reconnects and lawful attach/resume
   - anchored to causal sessions, strands, and checkout epochs
   - not yet admitted as canonical provenance

3. `canonical_provenance`
   - witness-backed admitted explanation for a staged target or commit
   - narrower than raw local history

4. `canonical_structural_truth`
   - durable structural worldline over commits and later admitted
     structural facts

### What is worth persisting

Default persist-worthy records:
- bounded read/write events with explicit footprints
- decision and intent checkpoints
- stage events
- transition events that start, fork, or park continuity
- explicit handoff / attach / resume events

Default non-persist-worthy residue:
- transport-only message counts
- queue bookkeeping
- cache internals
- runtime log lines that do not carry bounded product meaning
- undifferentiated whole-tool-call blobs when no usable footprint
  exists

### Unit of continuity

Persisted local history is keyed primarily by:
- `repoId`
- `causalSessionId`
- `strandId`
- `checkoutEpochId`

`transportSessionId` remains a correlation handle only.

The important continuity rule is:
- reconnecting may continue the same causal session
- rebinding may create a new workspace slice
- checkout transitions may park or fork a strand
- collapsing a staged target does not erase the raw local-history lane

### Lifecycle operations

Initial continuity operations:

- `start`
  - create a new causal session and first strand
- `attach`
  - a new transport session lawfully joins an existing causal session
- `resume`
  - a prior actor continues the same causal session after disconnect
- `fork`
  - create a new strand when continuity would otherwise become
    misleading
- `park`
  - mark a strand inactive because the checkout footing changed or the
    operator intentionally suspended it

Initial lawful attach conditions:
- same repo
- same or explicitly acceptable worktree
- same checkout epoch, or explicit fork/park semantics if not
- explicit actor evidence or handoff evidence when continuity would
  otherwise be ambiguous
- bounded continuity confidence that does not outrun the actual
  transport/worktree/writer evidence currently available

### Relationship to checkout epochs

Persisted local history is not allowed to smear across checkout-epoch
boundaries silently.

Branch switches, merges, rewrites, and detached-head moves must result
in one of:
- a parked strand
- a forked strand
- an explicitly re-anchored continuation record

This keeps local history inspectable without pretending one line of
work lived on one stable footing when it did not.

### Relationship to later collapse

Persisted local history exists to make later collapse possible and
meaningful, but it is not itself canonical provenance.

Collapse should be able to:
- select a staged target or commit checkpoint
- slice the relevant local-history records
- admit only that slice into canonical provenance
- leave the raw persisted local history intact for later inspection

That means this cycle should store enough local history to support
future slice-based collapse, but should not try to implement the full
collapse machinery while upstream substrate is still blocked.

## First implementation slices

### Slice 1: durable local-history records

Add a bounded local persistence seam that stores:
- causal session / strand / checkout-epoch identities
- event envelopes with explicit footprints
- continuity operations:
  attach, resume, fork, park

### Slice 2: inspectable status surfaces

Expose bounded surfaces for:
- `causal_status` as the direct active-workspace inspection surface
- active causal workspace status
- persisted local-history summaries
- bounded continuity evidence and confidence for the current footing
- "what survived from the last session?" answers

### Slice 3: continuity boundaries

Wire checkout transitions and explicit handoff points into the local
history lifecycle without yet claiming full collapse.

Bounded declaration surface:
- `causal_attach` as the explicit continuity / handoff declaration seam
  when transport and workspace evidence alone are not enough

## Upstream dependency boundary

### What Graft can settle locally now

- persistence classes and naming
- continuity and lifecycle rules
- local record envelope shape
- inspectable local-history surfaces
- park/fork/attach semantics
- bounded storage/read posture

### What remains blocked on `git-warp v17.1.0+`

- full strand-aware collapse onto canonical provenance
- upstream-native causal-slice admission machinery
- deeper braid/optic realization for collapse witnesses

## Delivery posture

This cycle is design-first but not design-only in spirit.

The deliverable should be:
- a settled contract for persisted local history
- playback questions that can later drive runtime seams
- enough repo truth that later implementation does not improvise what
  "history" means

The design should make one thing especially clear:

Persisted local history is durable `artifact_history` that preserves
meaning between hard Git commits. It is valuable precisely because it is
not yet pretending to be either Git history or admitted canonical
provenance.
