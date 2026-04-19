---
title: "System-wide multi-repo agent coordination"
---

# System-wide multi-repo agent coordination

Source backlog item: `docs/method/backlog/up-next/SURFACE_system-wide-multi-repo-agent-coordination.md`
Legend: SURFACE

## Sponsors

- Human: James
- Agent: Codex

## Hill

Make the multi-repo daemon story explicit before any larger system-wide
claim is made.

That means:

- define the boundary between canonical repo identity, live worktree
  identity, and daemon session identity
- define what truth is safe to project system-wide versus what must stay
  repo-local or session-local
- keep the system-wide coordination model observational instead of
  permission-granting
- split the follow-on work into the next honest implementation slices
  instead of keeping "multi-repo coordination" as one vague blob

## Playback Questions

### Human

- [x] Is the boundary between repo, worktree, and session identity now
  explicit instead of implied?
- [x] Is the proposed system-wide view bounded enough that it does not
  leak another session's receipts, cache, or saved state?
- [x] Is the next implementation work split into concrete follow-ons
  instead of one giant "multi-repo coordination" promise?

### Agent

- [x] Does canonical repo identity stay keyed to `git common dir` rather
  than collapsing worktrees into fake repo rows?
- [x] Does live workspace identity stay keyed to the resolved
  worktree root rather than becoming accidental daemon-global state?
- [x] Does the design keep same-repo concurrency and cross-repo
  coordination separate instead of smearing them together?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  one daemon, many sessions, many worktrees, and many canonical repos.
  Each layer keeps its own truth instead of being flattened into one
  global stream.
- Non-visual or alternate-reading expectations:
  the system-wide view should be available as bounded structured output
  with clear counts and filters rather than a noisy activity log or tray
  UI.

## Localization and Directionality

- Locale / wording / formatting assumptions:
  stable machine-readable names such as `repo`, `worktree`, `session`,
  `authorized`, `bound`, `running`, `lagging`, and `failing`.
- Logical direction / layout assumptions:
  none beyond canonical absolute paths for worktree roots and git common
  dirs.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  which identity layer a datum belongs to, which repos are visible in a
  system-wide projection, and which state is aggregate-only versus
  inspectable.
- What must be attributable, evidenced, or governed:
  authorization-derived visibility, repo-scoped monitor ownership,
  per-session local state, and the fact that coordination does not widen
  access to another session's receipts, runtime logs, or shell output.

## Non-goals

- [x] Do not implement new daemon transport or control-plane code in
  this cycle.
- [x] Do not claim same-repo concurrent write safety is solved here.
- [x] Do not introduce global cache, global budget, or global saved
  state.
- [x] Do not expose raw receipts, saved state content, runtime-log
  payloads, or shell output through a system-wide coordination surface.
- [x] Do not build cross-repo provenance or dependency reasoning in this
  cycle.

## Backlog Context

Design how Graft should behave when multiple agents are working across
different repositories on the same machine at the same time.

Questions:
- what state should remain strictly per-repo versus system-wide?
- what is the canonical identity for "a repo" in the system-wide view:
  - `git rev-parse --git-common-dir`
  - `git rev-parse --show-toplevel`
  - both, at different layers?
- how should a persistent monitor or control plane represent many repos
  concurrently without collapsing them into one noisy stream?
- what coordination is useful across repos:
  - health / liveness
  - backlog pressure
  - active agent count
  - resource contention
  - cross-repo provenance / dependency hints
- how should multiple worktrees of the same repo appear in the
  system-wide view?
- how should system-wide coordination relate to per-client MCP session
  state like budget, cache, and saved state?
- how do system-wide views avoid becoming an authorization side channel
  for repos or sessions that a client has not bound?

Deliverables:
- explicit system model for multi-repo simultaneous agent activity
- boundary between canonical repo identity, live worktree identity, and
  client session identity
- boundary between repo-local truth and system-wide coordination
- follow-on backlog split for any required control-plane or storage work

Current design leaning:
- canonical repo identity should likely key off
  `git rev-parse --git-common-dir`
- live workspace / policy identity should likely key off
  `git rev-parse --show-toplevel`
- agent-local state should remain per MCP session rather than becoming
  accidental global daemon state
- coordination should stay observational; it must not widen workspace
  access or expose another session's receipts by default

Why separate cycle:
- this is a product / control-plane design problem, not just a watcher
  detail

Effort: L

## System Model

### Identity layers

- canonical repo identity
  - key: `git rev-parse --git-common-dir`
  - meaning: one durable repo history and one default repo-scoped WARP
    ownership slot
- live worktree identity
  - key: `git rev-parse --show-toplevel`
  - meaning: one checkout / overlay / `.graftignore` / branch-local live
    view
- daemon session identity
  - key: daemon transport session id
  - meaning: one client-local cache, budget, saved state, receipt stream,
    and capability posture after bind

These layers must not be collapsed:

- a repo may have many worktrees
- a worktree may have many daemon sessions over time
- several daemon sessions may bind to different worktrees of the same
  repo

### What stays at each layer

- repo-scoped by default
  - shared WARP ownership
  - repo monitor inventory and aggregate monitor health
  - repo backlog and last-activity summaries
  - authorized-worktree count
  - active bound-session count
- worktree-scoped by default
  - resolved worktree root
  - live checkout / dirty overlay truth
  - `.graftignore` and worktree-local policy context
  - authorization anchor eligibility for repo monitors
- session-scoped by default
  - cache
  - budget
  - saved state
  - receipts and runtime log payloads
  - `run_capture` output
  - bound capability posture
- system-scoped by default
  - aggregate daemon counts only
  - coarse liveness / pressure summaries
  - no raw session-local content

## Resulting Product Contract

System-wide coordination should be split into two surfaces:

- aggregate daemon truth
  - safe for any daemon session
  - counts only: repos, worktrees, sessions, monitors, failing repos,
    backlog-bearing repos
- filtered repo overview
  - bounded one-row-per-repo projection
  - derived from the authorization registry and daemon-owned runtime
    state, not from hidden session activity alone
  - no raw receipts, caches, or saved-state content

The key visibility rule is:

- multi-repo coordination remains observational and authorization-
  filtered
- a system-wide view may count repos and worktrees globally
- it must not reveal raw session-local truth for a repo merely because
  another session touched it

This continues the trust model from cycle 0050:

- same-user local daemon only
- bind and authorization remain server-resolved
- coordination is not a permission grant

## Same-Repo Versus Cross-Repo Boundary

This cycle deliberately keeps two problems separate:

- same-repo concurrent-agent semantics
  - handled by
    `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- cross-repo system-wide coordination
  - handled here as the daemon-wide observational model

Why:

- same-repo work needs honesty around overlapping writers, worktrees,
  branch divergence, and provenance uncertainty
- cross-repo work needs bounded overview, filtered visibility, and
  resource-pressure shaping
- combining them too early would blur two different contracts

## Follow-on Split

This cycle resolves the design question by splitting the next
implementation work into:

- `docs/method/backlog/up-next/SURFACE_system-wide-repo-overview-and-filtered-inspection.md`
  - build the first real multi-repo overview surface
- `docs/method/backlog/up-next/SURFACE_system-wide-resource-pressure-and-fairness.md`
  - make backlog pressure and fairness explicit across many repos

Related but still separate:

- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/cool-ideas/WARP_cross-repo-dependency-tracking.md`
- `docs/method/backlog/cool-ideas/CORE_multi-agent-conflict-detection.md`
