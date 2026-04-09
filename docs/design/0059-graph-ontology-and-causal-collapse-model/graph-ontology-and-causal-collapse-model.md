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

Effort: XL
