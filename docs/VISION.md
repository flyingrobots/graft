---
title: "Graft — Executive Summary"
generated: 2026-04-10
generator: codex (manual, following Method executive-summary process)
tests: 633
test_files: 60
legends: [CORE, WARP, CLEAN_CODE, SURFACE]
backlog_items: 141
version: 0.4.0
status: "0060 active"
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

- the persistence model for bounded sub-commit local history
- how causal sessions and strands survive reconnects and handoff
- what becomes durable `artifact_history` and what remains transient
  runtime residue
- how persisted local history relates to later canonical provenance
  collapse
- how same-repo concurrent agents relate to shared repo history and
  separate worktree / session-local state

### Current cycle posture

METHOD currently shows one active cycle:

- `0060-persisted-sub-commit-local-history`

The two most recent closed packets are:

- `0058-system-wide-resource-pressure-and-fairness`
  - async Git, async daemon-heavy file paths, scheduler, workers,
    monitor routing, and writer lanes
- `0059-graph-ontology-and-causal-collapse-model`
  - graph layers, identities, event granularity, explicit provenance
    posture, playback witnesses, typed ontology contracts, and
    runtime-local causal/staged-target seams

`0060` is the first implementation-facing WARP packet on top of that
foundation. Its job is to define how meaningful between-commit
`artifact_history` survives across reconnects, handoff, and
checkout-aware continuity boundaries while treating full strand-aware
collapse as still blocked on upstream `git-warp v17.1.0+`.

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
  graph ontology and runtime-local causal footing now exist
- **Next honest packet**: persist bounded local between-commit history
  on top of that ontology without confusing it with canonical
  provenance

### CLEAN_CODE

Systems-Style JavaScript and substrate cleanup. Ports, boundaries,
runtime-backed forms, and honest seams.

## Near-term roadmap

### Immediate next

1. Pull persisted sub-commit local history behind the now-settled
   ontology.
2. Add provenance and attribution instrumentation on top of it.
3. Add branch/checkout-aware strand lifecycle handling, likely with
   target-repo Git hook bootstrap or an equivalent explicit Git
   transition boundary.
4. Continue same-repo concurrent-agent modeling against strands and
   writer lanes.
5. Push full strand-aware causal collapse once upstream `git-warp
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
