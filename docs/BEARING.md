# Bearing: Between-Commit Structural + Causal Memory

**Set:** 2026-04-09
**Direction:** Graft is evolving from a read governor with structural
memory into a provenance-aware WARP substrate for coding work between
"hard" Git commits.

## Why now

The repo now has two major foundations:

1. **WARP Level 1 structural memory** — commit-level AST evolution is
   real enough to support structural map/diff/since surfaces.
2. **Daemon execution substrate** — async Git, async daemon-heavy file
   paths, scheduler, child-process workers, monitor routing, and
   logical writer lanes now exist as real runtime machinery.

What is still missing is the meaning layer that ties those two halves
together.

The next honest problem is not "more worker pool" or "more daemon
fairness in the abstract." The next honest problem is:

- what the Graft WARP graph is supposed to store
- what a product "session" really is
- how speculative between-commit activity becomes durable provenance
- how and when any of that collapses into canonical structural truth

## Working mental model

Graft models two coupled things:

1. **AST / structural truth as it evolves over time**
2. **The activity that explains why those structural changes happened**

That implies:

- a transport session is not the same thing as a product session
- a product session is closer to a strand-scoped causal workspace
- commits and staged snapshots are collapse checkpoints
- collapse should usually admit a causal slice, not the whole strand
- canonical structural truth and canonical provenance are related, but
  not identical

## What ships under this bearing

1. **WARP graph ontology and collapse model**
   - explicit node/edge vocabulary
   - explicit split between structural truth and causal provenance
   - explicit definition of session, strand, checkout epoch, and
     collapse

2. **Persisted sub-commit local history**
   - meaningful between-commit activity survives across sessions
   - inspectable local history without pretending every event is durable
     Git truth

3. **Provenance and attribution instrumentation**
   - direct evidence for agent/human/git attribution
   - inspectable evidence trails
   - honest confidence boundaries

4. **Reactive workspace overlay and checkout epochs**
   - live overlay updates
   - explicit branch / checkout / merge / rewrite transitions
   - no smearing one causal workspace across incompatible bases

5. **Same-repo concurrent agent model**
   - clear separation between canonical repo history, worktree-local
     live state, and session-local causal state
   - strands or strand families instead of fake single-actor sessions

6. **Symbol continuity for precise slices**
   - rename continuity and stronger identity become more important once
     collapse is causal-slice-based instead of whole-session-based

## What is active now

Cycle `0059-graph-ontology-and-causal-collapse-model` is now active in
METHOD.

The previous `0058-system-wide-resource-pressure-and-fairness` cycle is
now closed as the execution-substrate packet. Its shipped tranche was:

- async `GitClient` via `@git-stunts/plumbing`
- async daemon-heavy request-path filesystem reads
- daemon scheduler and child-process worker pool
- monitor ticks routed through the scheduler
- logical WARP writer lanes keyed by stable writer identity rather than
  worker identity

That work is still valuable. It is the execution substrate the current
WARP ontology packet needs.

There is also a current upstream dependency boundary: full realization
of strand-aware causal collapse appears blocked on `git-warp`
`v17.1.0+`. That does not block design. It means the next Graft WARP
packet should settle ontology, collapse semantics, identities, and
witness shape now, while treating implementation of the deepest collapse
machinery as gated on the upstream release.

## What does NOT ship under this bearing

- pretending transport sessions are the final provenance model
- treating every transient read/search as canonical structural truth
- remote or multi-user daemon claims
- worker identity as graph provenance
- "whole strand collapse" as the default admission model
- a human-first GUI product story

## What just shipped

The daemon/system substrate is now real enough to support the next WARP
turn:

- cycles `0050`–`0057` established the trust model, daemon transport,
  workspace binding, control plane, persistent monitors, multi-repo
  overview, and explicit same-repo identity splits
- cycle `0058` built the async Git/FS, scheduler, worker, and
  writer-lane substrate needed for fair execution
- cycle `0059` is now the ontology / collapse packet that defines what
  those execution primitives are actually in service of
- backlog now explicitly captures branch-switch hook/bootstrap concerns
  and the need for a first-class graph ontology / collapse model

## What feels wrong

- `session` is still too transport-scoped in the code and docs
- branch / checkout transitions are not yet first-class strand or
  checkout-epoch boundaries
- target repos do not yet have an honest product hook/bootstrap story
  for branch-switch-aware strand management
- canonical structural truth versus canonical provenance is not yet an
  explicit ontology in code
- collapse semantics are still discussed more in design chat than in
  repo truth
- symbol identity is still name-addressable, which will make precise
  causal slicing noisy

## Bar For General System-Wide Use

Do not declare Graft ready for default use across arbitrary projects on
this machine until all of these are true:

1. **Unsupported-file degradation is honest** — no fake empty code
   outlines for unsupported text.
2. **Policy fidelity is unified** — MCP, CLI, hooks, historical reads,
   working-tree reads, budget/session handling, and `.graftignore`
   enforce the same contract.
3. **Structured outputs are versioned** — every machine-readable MCP /
   CLI surface has an explicit JSON schema with versioning.
4. **Layered worldline semantics exist in code** — commit worldline,
   ref views, workspace overlay, checkout epochs, and their boundaries
   are enforced by implementation and tests.
5. **Between-commit provenance semantics exist in code** — session
   strands, causal events, and collapse checkpoints are real product
   concepts, not only design language.
6. **Shared-daemon trust boundaries remain explicit** — client
   authentication posture, workspace authorization, session/log
   isolation, and escape-hatch gating stay inspectable and honest.
