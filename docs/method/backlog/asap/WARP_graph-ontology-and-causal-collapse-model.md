# WARP graph ontology and causal collapse model

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
