---
title: "Same-repo concurrent agent model"
legend: "WARP"
cycle: "0064-same-repo-concurrent-agent-model"
source_backlog: "docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md"
---

# Same-repo concurrent agent model

Source backlog item: `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Define the first honest same-repo concurrent-agent contract for Graft
so bounded surfaces can distinguish shared canonical repo history from
worktree-local live state and actor-local causal state, while treating
same-worktree overlap as supported observationally but provenance-uncertain
unless explicit handoff evidence exists.

## Playback Questions

### Human

- [ ] If two actors are working in the same worktree, can Graft tell a
      human that the line of work is shared or overlapping instead of
      pretending it still belongs cleanly to one actor?
- [ ] If two actors are working in different worktrees of the same
      repo, can Graft keep canonical repo history shared while keeping
      live workspace footing separate?
- [ ] If two actors touch the same files or symbols without an explicit
      handoff, does Graft downgrade provenance confidence instead of
      inventing a clean ownership story?
- [ ] If two actors are active in the same repo but on different
      branches or checkout epochs, can Graft surface that as
      divergence instead of silently merging their lines of work?
- [ ] When evidence is too weak to separate actor ownership from shared
      repo activity, does Graft say `unknown` / `shared` instead of
      faking single-actor certainty?

### Agent

- [ ] Is the identity split explicit enough to implement without churn:
      canonical repo keyed by Git common dir, live workspace keyed by
      worktree root plus checkout epoch, and causal state keyed by
      causal session / strand family?
- [ ] Is it explicit which same-repo scenarios are supported
      observationally versus unsupported for confident provenance or
      merge semantics?
- [ ] Is the downgrade rule explicit that overlapping actors in one
      worktree imply provenance uncertainty unless explicit handoff
      evidence exists?
- [ ] Is it explicit what shared state may exist across sessions in the
      same repo and what must remain worktree-local or actor-local?
- [ ] Does the cycle keep multi-writer merge semantics out of scope
      while still improving same-repo multi-actor honesty?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - answer the human question first: "are these actors sharing one live
    workspace, or only one repo history?"
  - separate the three scopes in plain language:
    shared repo, shared worktree, shared causal workspace
  - prefer "shared", "overlapping", "separate", and "unknown" over
    low-level concurrency jargon
- Non-visual or alternate-reading expectations:
  - concurrency posture must be inspectable through bounded JSON and
    short text summaries
  - overlap / divergence meaning must not depend on charts, colors, or
    animated workspace timelines
  - the distinction between shared canonical history and shared live
    workspace must survive linear screen-reader order

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - user-facing wording should favor "same repo", "same worktree",
    "different worktree", "shared line of work", and "actor overlap"
    over internal scheduler or daemon language
  - `shared` and `unknown` remain lawful product states, not wording
    gaps to be hidden
- Logical direction / layout assumptions:
  - concurrency posture must be communicable in ordered text and JSON
    without spatial diagrams
  - when multiple actors are present, summaries should group by scope
    first, then by actor relationship, then by uncertainty / evidence

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - whether concurrency is being reasoned about at common-dir,
    worktree, or actor-local scope
  - whether another actor shares the current worktree or only the
    canonical repo history
  - whether the current line of work is exclusive, shared, overlapping,
    divergent, or unknown
  - whether the model is observational only or supported for stronger
    provenance claims
- What must be attributable, evidenced, or governed:
  - explicit attach / handoff declarations
  - worktree identity, checkout epoch, and branch / divergence signals
  - footprint overlap strong enough to justify provenance downgrade
  - downgrade-to-`unknown` / `shared` rules when evidence is weak
  - the rule that multi-writer merge semantics remain out of scope

## Non-goals

- [ ] Implement multi-writer WARP merge semantics in this cycle.
- [ ] Pretend shared canonical repo history means a shared live
      workspace.
- [ ] Collapse overlapping actor activity into one clean causal session
      without explicit evidence.
- [ ] Solve full collision detection or automated conflict resolution.
- [ ] Treat same-repo overlap as canonical provenance instead of
      bounded `artifact_history` / runtime footing.

## Backlog Context

Design how Graft should handle multiple agents working in the same git
repository at the same time.

This needs to be explicit because the current Level 1 contract is still
single-writer-honest.

Questions:
- what is the difference between:
  - two agents in the same worktree
  - two agents in different worktrees of the same repo
  - two agents on different branches of the same repo
  - two agents touching the same files versus disjoint files
- what concurrency claims can Graft safely make without pretending
  multi-writer semantics already exist?
- what shared state, if any, should exist across MCP sessions in the
  same repo?
- what should be keyed by:
  - git common dir
  - worktree root
  - client/session id
- when should Graft surface:
  - concurrent read/write drift
  - potential edit collisions
  - semantic branch divergence
  - provenance uncertainty caused by overlapping actors
- how does this relate to the existing single-writer invariant and any
  future higher-level WARP model?

Deliverables:
- explicit same-repo concurrency model
- clear statement of supported versus unsupported concurrent scenarios
- explicit split between canonical repo history, worktree-local live
  state, and session-local agent state
- follow-on backlog split for conflict detection, shared observation
  state, or multi-writer evolution if needed

Current design leaning:
- same repo in different worktrees should share canonical history but
  not be collapsed into one live workspace
- same worktree with multiple agents should be supported
  observationally, but with provenance uncertainty rather than fake
  single-actor confidence
- multi-writer merge semantics remain out of scope until a later WARP
  level

Related:
- `docs/invariants/single-writer-honest.md`
- `docs/method/backlog/cool-ideas/CORE_multi-agent-conflict-detection.md`

Why separate cycle:
- this is deeper than conflict detection; it is a contract question
  about repo truth, writers, and concurrent observation

Effort: L

## Problem framing

`0060` settled persisted local history, `0061` settled attribution,
`0062` settled reactive overlay footing, and `0063` settled semantic
transition meaning. Those packets made Graft much more honest about one
line of work.

They did not yet settle what happens when more than one actor is using
the same repo at the same time.

Without this cycle, Graft still risks blurring three different claims:

- two actors share a canonical Git / WARP history
- two actors share one live worktree and staged/index reality
- two actors share one causal workspace or coherent line of work

Those are not the same claim. If Graft does not separate them
explicitly, humans and agents will overread bounded surfaces and assume
ownership or safety contracts that do not exist.

## Proposed model

### Identity scopes

Separate same-repo concurrency into three scopes:

1. **Canonical repo scope**
   - keyed by Git common dir
   - shared commit history, refs, and future WARP canonical history
   - does not imply shared live overlay or shared actor intent

2. **Live workspace scope**
   - keyed by worktree root plus checkout epoch
   - owns live filesystem footing, index/staged state, overlay footing,
     and checkout-boundary transitions
   - shared by actors using the same worktree at the same time

3. **Actor-local causal scope**
   - keyed by causal session / strand family
   - owns attach / handoff declarations, local activity,
     attributed artifact history, and future causal slices
   - may overlap another actor's live workspace without becoming the
     same causal session

### Supported scenario classes

#### Same repo, different worktrees

- shared canonical repo scope: yes
- shared live workspace scope: no
- shared causal workspace: no, unless explicitly attached across
  worktrees later
- product meaning: separate live lines of work with shared repo truth

#### Same repo, same worktree, different actors

- shared canonical repo scope: yes
- shared live workspace scope: yes
- shared live worktree: yes
- shared causal workspace: not by default
- product meaning: supported observationally, but provenance must
  downgrade to `shared` / `overlapping` / `unknown` when actor
  ownership cannot be separated lawfully

#### Same repo, different branches / checkout epochs

- shared canonical repo scope: yes
- shared live workspace scope: only if the same worktree moved across a
  boundary
- shared causal workspace: only with explicit continuation / attach
  evidence
- product meaning: branch or checkout divergence is a semantic boundary
  that bounded surfaces should report as divergence, not silent
  continuity

#### Overlapping versus disjoint footprints

- disjoint footprints in one worktree may remain observationally
  distinguishable
- overlapping footprints in one worktree must downgrade confidence
- same-file or same-symbol overlap is enough to block clean single-actor
  provenance unless a lawful handoff exists
- bounded surfaces must not present clean single-actor ownership when
  overlap evidence says otherwise

### Concurrency postures

For this cycle, bounded surfaces should reason in a small, honest
vocabulary:

- `exclusive`
- `shared_repo_only`
- `shared_worktree`
- `overlapping_actors`
- `divergent_checkout`
- `unknown`

These are runtime / artifact-history posture labels, not canonical
provenance claims.

### Evidence hierarchy

Strongest to weakest:

1. explicit attach / handoff declarations
2. same worktree identity plus overlapping active windows
3. overlapping footprints within one live workspace
4. shared canonical repo identity only
5. no lawful evidence beyond ambient repo presence

Higher layers may justify stronger separation or stronger uncertainty.
Lower layers must not be used to fake clean ownership.

### Shared-state rules

What may be shared across sessions in the same repo:
- canonical repo identity
- future shared WARP canonical history
- common-dir-level repo posture

What must remain worktree-local:
- live overlay footing
- staged target snapshots
- hook-observed checkout-boundary state

What must remain actor-local unless explicitly attached:
- causal session / strand family
- attributed local artifact history
- attach / handoff intent

## Provenance honesty boundary

Same-repo concurrency does not upgrade Level 1 into lawful
multi-writer semantics.

This cycle is allowed to say:
- multiple actors share this repo
- multiple actors share this worktree
- these actors likely overlap on the same footprint
- provenance confidence must downgrade

This cycle is not allowed to say:
- overlapping actors are safely merged into one truth-preserving writer
- actor ownership is clean when overlap evidence says otherwise
- shared repo identity implies shared causal intent

## Follow-on seams

This cycle should leave room for later packets, not solve them all:

- collision detection and warnings
- shared observation state across sessions
- stronger same-symbol continuity
- multi-writer WARP semantics
- richer human-facing activity / overlap views
