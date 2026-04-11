---
title: "Graft — Executive Summary"
generated: 2026-04-11
generator: codex (manual, following Method executive-summary process)
tests: 742
test_files: 71
legends: [CORE, WARP, CLEAN_CODE, SURFACE]
backlog_items: 139
version: 0.5.0
status: "release/v0.5.0 branch cut; paused before release execution"
---

# Graft — Executive Summary

## Vision

Graft started as a context governor for coding agents because agents
were burning enormous context on full-file reads, repeated reads, and
raw-file spelunking.

That is still true, but it is no longer the whole story.

The product direction now looks like this:

- **Git tracks hard byte checkpoints**
- **Graft tracks how code structure evolves between those checkpoints**
- **Graft also tracks the activity that explains why those structural
  changes happened**

So the long-term product is not only "smaller reads." It is a
provenance-aware substrate for coding work.

WARP is the key shift. WARP is not just historical storage for AST
deltas. It is the place where Graft can eventually model:

- structural worldlines across commits
- workspace overlays between commits
- strand-scoped causal workspaces for sessions
- the observation / edit / stage / transition activity that explains
  later structural changes
- collapse checkpoints that admit only the relevant causal slice into
  canonical provenance and, when appropriate, canonical structural truth

In other words: Graft should remember not only what changed, but why it
changed.

## Product truth

Current deployment truth is still local-user and explicit:

- repo-scoped stdio MCP (`graft serve`) for editor bootstrap
- same-user local daemon (`graft daemon`) on a Unix socket or Windows
  named pipe for shared-machine multi-session work

The daemon is now real runtime infrastructure, but it is not the final
product meaning. It is the execution substrate for the provenance model
above.

The current working model is:

- **Structural truth**: AST / symbol / file evolution over time
- **Causal provenance**: reads, writes, edits, stages, and transitions
  that explain structural changes
- **Session**: not merely a transport socket, but eventually a
  strand-scoped causal workspace
- **Collapse**: not "admit the whole session," but admit the causal
  slice relevant to the staged artifact or commit checkpoint

## Current state

### What is already real

- bounded-read governance and policy enforcement
- structural map / diff / since surfaces
- daemon transport, workspace binding, authorization, and repo overview
- persistent background WARP indexing monitors
- async Git on the daemon path via `@git-stunts/plumbing`
- async daemon-heavy request-path filesystem reads
- daemon scheduler and child-process worker pool
- logical WARP writer lanes keyed by stable writer identity rather than
  worker identity

### What is still being defined

- how persisted local `artifact_history` becomes admitted canonical
  provenance
- how persisted local history relates to later canonical provenance
  collapse
- how reactive workspace overlays are observed and bounded across live
  edits and checkout transitions
- how richer semantic transition meaning sits on top of raw Git
  lifecycle events and checkout-boundary footing
- how same-repo concurrent agents relate to shared repo history and
  separate worktree / session-local state

### Current cycle posture

METHOD currently shows no active cycle. The repo is paused on
`release/v0.5.0` before release execution.

The most recently closed cycle is:

- `0065-between-commit-activity-view`
  - shipped the first honest human-facing surface for bounded
    between-commit activity
  - answers "what recent local activity is visible from this line of
    work?" without requiring chat-log or raw-receipt reconstruction
  - keeps the truth class explicit as bounded local
    `artifact_history`, not canonical provenance
  - groups activity around the active causal workspace, staged target,
    semantic transitions, degraded posture, and current commit anchor
    where possible
  - adds a thin CLI peer wrapper at `graft diag activity`

- `0064-same-repo-concurrent-agent-model`
  - defined the first honest same-repo concurrency contract on top of
    the prior lifecycle, attribution, and semantic-transition packets
  - separated canonical repo scope, live worktree scope, and
    actor-local causal scope
  - surfaced bounded `repoConcurrency` posture and concurrency-aware
    guidance
  - merged daemon live-session topology into the same-repo model so
    daemon mode no longer collapses into false exclusivity
  - added lawful cross-session same-worktree handoff semantics through
    `causal_attach` without pretending multi-writer provenance already
    exists
- `0063-richer-semantic-transitions`
  - defined the first honest semantic-transition vocabulary on top of
    the `0062` overlay/lifecycle footing
  - separated raw lifecycle events from richer transition meaning such
    as `index_update`, `conflict_resolution`, `merge_phase`,
    `rebase_phase`, `bulk_transition`, and lawful `unknown`
  - made merge/rebase phase visibility and many-file transition
    summaries bounded product truth instead of leaving agents to infer
    repo meaning from coarse lifecycle buckets
  - added transition-aware bounded guidance and persisted semantic
    transition artifact-history
  - kept semantic transition meaning separate from canonical
    provenance and later causal collapse

The three most recent closed packets are:

- `0062-reactive-workspace-overlay`
  - made workspace-overlay footing explicit product truth
  - distinguished reactive local edit signals from canonical Git
    transition boundaries
  - anchored live overlay state to checkout epochs instead of only
    between-tool-call inference
  - added honest degraded posture when target-repo hooks/bootstrap are
    absent
  - surfaced stable-vs-forked lineage posture and boundary authority
  - changed post-transition guidance from implicit continue to
    explicit boundary review
- `0061-provenance-attribution-instrumentation`
  - explicit runtime attribution summaries for `agent`, `human`,
    `git`, and `unknown`
  - bounded attribution inspection through `doctor`,
    `causal_status`, and `causal_attach`
  - artifact-local staged-target attribution
  - attributed local `stage` events
  - attributed local `read` events with explicit footprints and source
    layers
  - explicit `artifact_history` honesty rather than canonical
    provenance overclaim
- `0059-graph-ontology-and-causal-collapse-model`
  - graph layers, identities, event granularity, explicit provenance
    posture, playback witnesses, typed ontology contracts, and
    runtime-local causal/staged-target seams
- `0060-persisted-sub-commit-local-history`
  - persisted local-history records under the stable Graft root
  - checkout-aware continuity park/fork boundaries
  - `causal_status` as the bounded active-workspace surface
  - `causal_attach` as the explicit attach/handoff declaration seam
  - evidence-bounded continuity summaries and inspectable local
    artifact-history posture

`0061` closed the first trust packet on top of the persisted
local-history substrate. `0060` settled that bounded local history can
survive reconnects and handoff. `0061` settled who or what the product
can honestly say advanced that history, with inspectable evidence and
no false certainty.

`0062` closed the lifecycle packet on top of that trust substrate.
It made the live workspace overlay and checkout-boundary posture
explicit enough that persisted local history and attribution no longer
ride only on silent best-effort snapshots.

## Architecture

```text
src/
  ports/        hexagonal ports (FileSystem, JsonCodec, ProcessRunner, GitClient)
  adapters/     Node implementations and plumbing-backed Git adapter
  policy/       read governance and refusal logic
  parser/       tree-sitter WASM parsing and structural extraction
  operations/   bounded operations over files, refs, and state
  session/      session tracker and session-local budgeting state
  warp/
    indexer.ts     commit indexer
    observers.ts   observer factory
    open.ts        WARP graph open/configure
    writer-id.ts   logical writer identities
  mcp/
    server.ts                  tool registration + execution routing
    daemon-server.ts           same-user local daemon host
    daemon-control-plane.ts    authorization / session / workspace control
    daemon-job-scheduler.ts    queueing and fairness substrate
    daemon-worker-pool.ts      child-process worker pool
    workspace-router.ts        bind/rebind and workspace slices
    persistent-monitor-runtime.ts  repo-scoped monitor runtime
    repo-state.ts              repo transition interpretation
    tools/                     MCP tool handlers
  cli/
    init.ts       repo bootstrap and local config seeding
    main.ts       CLI entry
  hooks/        Claude Code hook integration and future hook-adjacent seams
```

The important architectural split is:

- **daemon = authority**
  - authz
  - session/workspace bookkeeping
  - scheduling
  - receipts and observability
- **workers = execution resources**
  - heavy reads
  - scans
  - monitor jobs
  - live precision paths
- **WARP = memory substrate**
  - structural truth over time
  - later, causal provenance and strand-scoped between-commit history

## Legends

### CORE

The governor itself: bounded reads, policy, receipts, diagnostics,
bootstrap, and operator-facing surfaces.

### SURFACE

Runtime and daemon-facing product surfaces: daemon transport, bind/
rebind, control plane, repo overview, fairness, worker execution.

### WARP

Structural and causal memory over Git.

- **Level 1 shipped**: commit-level structural memory
- **Current inflection point**: execution substrate exists, but the
  graph ontology, runtime-local causal footing, and persisted local
  artifact-history now exist
- **Most recently closed packet**: make the live workspace overlay and
  checkout-boundary footing explicit enough to support honest
  between-commit lifecycle semantics

### CLEAN_CODE

Systems-Style JavaScript and substrate cleanup. Ports, boundaries,
runtime-backed forms, and honest seams.

## Near-term roadmap

### Immediate next

1. Pull `WARP_same-repo-concurrent-agent-model` now that lifecycle,
   attribution, and semantic-transition footing are all real.
2. Strengthen symbol/rename continuity so later causal slicing and
   staged-artifact reasoning are less path-noisy.
3. Push full strand-aware causal collapse once upstream `git-warp
   v17.1.0+` support exists.

### High-value WARP packets already in backlog

- `WARP_graph-ontology-and-causal-collapse-model`
- `WARP_persisted-sub-commit-local-history`
- `WARP_provenance-attribution-instrumentation`
- `WARP_reactive-workspace-overlay`
- `WARP_same-repo-concurrent-agent-model`
- `WARP_symbol-identity-and-rename-continuity`

## Value proposition

The governor story is still valuable on its own:

- lower context burden
- fewer wasteful full-file reads
- bounded, machine-readable structural tools
- better default behavior for agents

But the more interesting long-term value is stronger now, not weaker.

If Graft really captures AST evolution plus the activity that explains
those AST changes between hard Git commits, then it becomes something
Git does not provide and line-oriented tools cannot fake:

- replayable causal provenance for code changes
- partial-stage-aware collapse of only the relevant activity
- explainable structural history instead of only byte history
- session-local speculative workspaces that later admit into canonical
  truth lawfully

That is a much more defensible product than "AST diffs plus hooks."

## Open questions

1. **Ontology first.** What exactly are the first-class nodes and edges
   of the Graft WARP graph?
2. **Session semantics.** Is a product session a strand, a strand
   family, or a larger causal envelope spanning multiple checkout
   epochs?
3. **Collapse.** What becomes canonical structural truth, what becomes
   canonical provenance, and what remains strand-local only?
4. **Checkout epochs.** How do branch switches, merges, rewrites, and
   rebases delimit or transform strands?
5. **Identity.** How soon do we need stronger symbol identity to make
   causal slices and rename continuity trustworthy?
6. **Human edits.** What is the honest capture path for human work that
   happens outside agent-mediated tool calls?
