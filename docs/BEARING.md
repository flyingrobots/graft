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

Cycle `0065-between-commit-activity-view` is now closed. It shipped the
first honest human-facing surface for bounded between-commit work:

- bounded `activity_view` over local `artifact_history`
- explicit `HEAD` anchoring when available, with explicit unknown
  posture when not
- grouped recent continuity, transition, staging, and read activity
- active causal workspace, staged-target, semantic-transition, and
  degraded context carried through instead of flattened away
- human-readable summary text on the bounded activity surface
- thin CLI peer wrapper at `graft diag activity`

METHOD currently shows no active cycle. The repo is paused before
release preparation so the current hill can be evaluated as one
coherent cut instead of being widened indefinitely.

The most recent foundational packets remain:

Cycle `0062-reactive-workspace-overlay` shipped the live-footing packet
that the prior persisted-history and attribution work needed:

- explicit workspace-overlay footing instead of only
  between-tool-call inference
- target-repo hook/bootstrap posture as bounded product truth
- installed target-repo transition hooks and hook-observed
  checkout-boundary evidence
- stable-vs-forked overlay lineage posture with explicit authority
  (`none`, `repo_snapshot`, or `hook_observed`)
- boundary-review guidance after transition-caused forks instead of
  silently defaulting to “continue”

Its paired companion seam,
`SURFACE_target-repo-git-hook-bootstrap.md`, is now partially realized
in code and no longer reads like optional bootstrap polish. It is part
of the shipped checkout-boundary story.

Cycle `0063-richer-semantic-transitions` is now also closed.
It shipped the first honest meaning layer on top of `0062`:

- explicit semantic transition vocabulary beyond raw Git lifecycle
  buckets
- bounded runtime distinctions between `index_update`,
  `conflict_resolution`, `merge_phase`, `rebase_phase`,
  `bulk_transition`, and lawful `unknown`
- merge/rebase phase visibility as bounded product truth instead of
  agent-only inference
- transition-aware bounded guidance for conflict cleanup, active merge,
  active rebase, and many-file bulk movement
- persisted local semantic transition `artifact_history`
- sharper human-facing summaries for `bulk staging`, `bulk edit sweep`,
  and directional conflict posture changes

Cycle `0064-same-repo-concurrent-agent-model` also closed and shipped
the first honest same-repo multi-actor packet:

- bounded `repoConcurrency` posture across shared repo, shared
  worktree, overlapping actor, divergent checkout, and explicit handoff
- daemon live-session awareness so daemon mode no longer collapses
  same-repo concurrency into false exclusivity
- concurrency-aware bounded guidance on top of existing transition and
  lifecycle guidance
- lawful cross-session same-worktree handoff through `causal_attach`
  when exactly one live source session is identifiable
- continued refusal to overclaim multi-writer provenance or merge
  semantics

The last two shipped packets were:

- async `GitClient` via `@git-stunts/plumbing`
- async daemon-heavy request-path filesystem reads
- daemon scheduler and child-process worker pool
- monitor ticks routed through the scheduler
- logical WARP writer lanes keyed by stable writer identity rather than
  worker identity

and:

- the first honest WARP ontology for Graft
- typed contracts for causal events, staged targets, and collapse
  witnesses
- explicit artifact-history / canonical-provenance / inference posture
- runtime-local causal footing IDs
- runtime-local staged-target snapshots with bounded availability
  semantics

Cycle `0060-persisted-sub-commit-local-history` is now also closed.
It shipped the first honest persisted between-commit artifact-history
substrate:

- persisted local-history records under the stable Graft root
- checkout-aware continuity park/fork boundaries
- `causal_status` as a bounded active-workspace inspection surface
- `causal_attach` as an explicit attach / handoff declaration seam
- evidence-bounded continuity summaries rather than implied certainty

That work is still valuable. It is the execution substrate the current
WARP direction now stands on.

There is also a current upstream dependency boundary: full realization
of strand-aware causal collapse appears blocked on `git-warp`
`v17.1.0+`. That does not block design. It means the next Graft WARP
implementation packet should build on the now-settled ontology while
treating the deepest collapse machinery as gated on the upstream
release.

`0061-provenance-attribution-instrumentation` is now also closed.
It shipped the first honest runtime attribution packet on top of
persisted local history:

- explicit runtime attribution summaries for `agent`, `human`, `git`,
  and `unknown`
- bounded inspection of attribution through `doctor`,
  `causal_status`, and `causal_attach`
- artifact-local staged-target attribution
- attributed local `stage` events
- attributed local `read` events with explicit footprints and source
  layers
- no false certainty beyond what the captured evidence supports

`0062` was the lifecycle packet on top of that substrate.

Its delivered job was to make the workspace overlay a first-class
reactive product concept:

- explicit overlay footing instead of best-effort between-tool-call
  inference
- explicit precedence between Git transition signals and local edit
  signals
- honest degraded posture when target-repo hooks/bootstrap are absent
- no smearing one active causal workspace across incompatible checkout
  bases

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
- cycle `0059` closed the ontology / collapse packet and defined what
  those execution primitives are actually in service of
- cycle `0060` closed the first persisted sub-commit local-history
  packet so Graft can preserve bounded between-commit memory without
  overclaiming its truth class
- cycle `0061` closed the first provenance/attribution packet so
  persisted local history can explain who or what advanced a line of
  work instead of only that the line of work survived
- cycle `0062` closed reactive workspace overlay semantics so live
  workspace footing and checkout boundaries are now first-class
  product truth instead of only inferred repo snapshots
- cycle `0063` closed the first richer semantic-transition packet so
  bounded surfaces can explain what kind of repo/workspace meaning is
  active right now instead of only that a raw Git lifecycle event
  happened
- backlog now explicitly captures branch-switch hook/bootstrap concerns
  and the need for a first-class graph ontology / collapse model

## What feels wrong

- `session` is still too transport-scoped in the code and docs
- runtime surfaces still under-express actor attribution unless direct
  evidence is made explicit and inspectable
- branch / checkout transitions are now first-class continuity
  boundaries in local history, but not yet first-class strand or
  overlay transitions everywhere in the product
- target repos do not yet have an honest product hook/bootstrap story
  for branch-switch-aware strand management
- same-repo multi-actor meaning now has a first honest bounded
  contract, but it is still not multi-writer provenance and not a
  remote/multi-user model
- humans still lack one direct between-commit activity surface; the
  substrate exists, but the release-facing summary experience is still
  missing, and `0065` is the packet for that gap
- canonical structural truth versus canonical provenance is now explicit
  in repo truth, but not yet realized end-to-end in runtime behavior
- collapse semantics are now in repo truth, but still blocked from full
  realization by upstream `git-warp v17.1.0+`
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
