---
title: "Richer semantic transitions"
legend: "WARP"
cycle: "0063-richer-semantic-transitions"
source_backlog: "docs/method/backlog/up-next/WARP_richer-semantic-transitions.md"
---

# Richer semantic transitions

Source backlog item: `docs/method/backlog/up-next/WARP_richer-semantic-transitions.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Define the first honest semantic-transition vocabulary for Graft so
bounded surfaces can explain whether current repo/workspace movement is
an `index_update`, `conflict_resolution`, `merge_phase`,
`rebase_phase`, `bulk_transition`, or explicitly `unknown`, with
evidence and summaries that help both humans and agents reason about
what changed in meaning instead of only what Git lifecycle event fired.

## Playback Questions

### Human

- [ ] After a meaningful repo transition, can a human inspect bounded
      surfaces and see transition meaning beyond raw Git lifecycle
      names like `checkout`, `merge`, or `rebase`?
- [ ] When many files move at once, does Graft summarize the transition
      in a way that helps a human understand whether this was bulk
      staging, conflict cleanup, merge fallout, or rebase churn?
- [ ] When conflict files are resolved or reintroduced, can a human see
      that as `conflict_resolution` instead of only generic dirty-state
      churn?
- [ ] During merge or rebase work, can a human see which phase they are
      in instead of only that "some transition happened"?
- [ ] When the evidence is weak, mixed, or too coarse, does Graft say
      `unknown` instead of pretending semantic confidence it does not
      have?

### Agent

- [ ] Are the semantic transition classes explicit enough to implement
      without churn:
      `index_update`, `conflict_resolution`, `merge_phase`,
      `rebase_phase`, `bulk_transition`, `unknown`?
- [ ] Is the evidence hierarchy explicit enough that agents know when a
      transition meaning is authoritative, inferred from repo state, or
      unavailable?
- [ ] Is the distinction explicit between raw Git lifecycle events and
      higher-level semantic transition meaning?
- [ ] Are merge/rebase phase boundaries explicit enough that agents do
      not invent their own repo lifecycle rules?
- [ ] Does the cycle keep semantic transition meaning separate from
      canonical provenance and later causal collapse?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - explain semantic transitions as "what kind of repo movement is this
    right now?" before introducing narrower labels
  - prefer plain terms like "conflict cleanup" or "bulk staging" in
    human-facing summaries while keeping machine labels stable
  - let a user answer "what changed in meaning?" without reading raw
    reflogs, state files, or hook payloads
- Non-visual or alternate-reading expectations:
  - transition meaning must be inspectable through bounded JSON and
    short text summaries
  - summaries must not rely on timelines, colors, or graphical
    diff heat maps to communicate phase or posture
  - large transition summaries should stay understandable in linear
    screen-reader-friendly order

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - user-facing terms should prefer "merge phase", "rebase phase",
    "conflict resolution", and "index update" over Git plumbing jargon
  - `unknown` remains a lawful product state, not a temporary wording
    gap to be hidden
- Logical direction / layout assumptions:
  - transition semantics must survive in ordered text and JSON without
    diagram dependence
  - multi-file transition summaries should be expressed as counts,
    affected scopes, and boundary flags instead of spatial layout cues

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - the current semantic transition class, if any
  - whether that class is backed by authoritative repo evidence or a
    weaker inferred summary
  - the current merge/rebase phase when Git state files make that
    inspectable
  - whether the transition meaning belongs to live overlay footing,
    persisted local artifact history, or later canonical provenance
- What must be attributable, evidenced, or governed:
  - state-file or index evidence for merge/rebase/conflict meaning
  - file-count and staged/unstaged distribution for bulk transition
    summaries
  - downgrade rules to `unknown`
  - the rule that semantic transition meaning must not outrun the
    strength of the repo evidence that supports it

## Non-goals

- [ ] Implement full strand-aware causal collapse in this cycle.
- [ ] Invent symbol-level causal explanations for transitions before
      symbol continuity is stronger.
- [ ] Replace raw Git lifecycle observation; this cycle interprets it.
- [ ] Solve same-repo multi-actor merge semantics.
- [ ] Treat semantic transition meaning as canonical provenance.

## Backlog Context

Expand semantic repo transitions beyond the first slice of `checkout`,
`reset`, `merge`, and `rebase`.

Scope:
- `conflict-resolution`
- `index-update`
- better merge/rebase phase visibility
- clearer summaries for transitions that change many files at once

Why separate cycle:
- this is primarily about user-facing repo meaning, not raw event
  collection

Effort: M

Related:
- `docs/design/0062-reactive-workspace-overlay/reactive-workspace-overlay.md`
- `docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md`
- `docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md`
- `docs/method/backlog/up-next/WARP_symbol-identity-and-rename-continuity.md`
- `docs/method/backlog/cool-ideas/WARP_causal-blame-for-staged-artifacts.md`

## Problem framing

`0062` made checkout-boundary footing and hook/bootstrap posture
explicit. That solved a lifecycle honesty problem, but not yet a
meaning problem.

Today Graft can say:
- a checkout-boundary hook fired
- the overlay is stable or forked
- continuity evidence came from repo snapshots or hooks

What it still cannot say clearly is:
- whether the user is mostly resolving conflicts or just editing
- whether a many-file change is bulk staging versus merge fallout
- which phase of a merge or rebase is currently in effect
- when the semantic meaning is simply not inspectable enough yet

If bounded surfaces stay at the raw lifecycle layer, humans and agents
must still reverse-engineer the meaning of transitions themselves.

## Proposed model

### Transition layers

Separate two related but distinct layers:

1. **Git lifecycle event**
   - checkout
   - merge
   - rebase
   - reset
   - hook-observed transition payloads

2. **Semantic transition meaning**
   - `index_update`
   - `conflict_resolution`
   - `merge_phase`
   - `rebase_phase`
   - `bulk_transition`
   - `unknown`

Git lifecycle events tell Graft that something happened.
Semantic transitions tell bounded surfaces what kind of repo meaning is
currently inspectable.

### Semantic transition classes

#### `index_update`

Use when the strongest current meaning is "the staged/index boundary
changed" and there is no stronger conflict/merge/rebase interpretation.

Examples:
- newly staged files
- unstaged-to-staged movement across many paths
- targeted restaging after edits

#### `conflict_resolution`

Use when the strongest current meaning is conflict cleanup or conflict
movement.

Examples:
- unmerged entries becoming resolved
- conflicted files shrinking toward a clean index
- conflict posture worsening after a merge/rebase step

#### `merge_phase`

Use when merge state is active and phase is inspectable.

Phases for this cycle:
- `started`
- `conflicted`
- `resolved_waiting_commit`
- `completed_or_cleared`

#### `rebase_phase`

Use when rebase state is active and phase is inspectable.

Phases for this cycle:
- `started`
- `conflicted`
- `continued`
- `completed_or_cleared`

#### `bulk_transition`

Use when many paths move together and the best current product truth is
high-level scope/shape rather than a narrow single-file meaning.

For this cycle, the summary should focus on:
- file count
- staged/unstaged distribution
- whether conflict markers or rebase/merge state are present
- whether the movement looks like lifecycle fallout versus operator
  staging

#### `unknown`

Use when the repo evidence is too weak, mixed, stale, or too coarse to
support a stronger semantic interpretation.

### Evidence hierarchy

From strongest to weakest:

1. authoritative Git state files and index posture
   - merge/rebase state files
   - unmerged index entries
   - staged target snapshots
2. target-repo hook-observed transition events
3. current repo snapshot inference
4. degraded best-effort runtime footing

Higher layers may refine lower ones, but weaker evidence must never
override a stronger explicit transition state.

### Merge/rebase phase visibility

This cycle should make merge/rebase progress inspectable as phase, not
only as one opaque transition bucket.

Bounded surfaces should be able to say:
- merge started and is now conflicted
- merge conflicts are resolved but commit/admission is still pending
- rebase is currently conflicted
- rebase continued and the active phase cleared

### Bulk transition summaries

Bounded surfaces should provide a coarse summary when a transition
changes many files at once.

The summary should answer:
- how many files moved
- how many are staged versus unstaged
- whether unmerged/conflict posture exists
- whether merge/rebase state is active
- whether the semantic meaning is still only `bulk_transition` or can
  be sharpened to conflict or phase language

### Honesty boundary

Semantic transition meaning is not canonical provenance.

This cycle should improve how Graft explains live repo/workspace
movement without pretending that:
- a later causal slice has been computed
- symbol-level causal explanation exists
- semantic transition summaries are admitted canonical truth

### Surfaces for this cycle

#### Slice 1: vocabulary and contract

Define the stable transition kinds, phase terms, evidence hierarchy,
and downgrade-to-`unknown` rules.

#### Slice 2: bounded inspection

Project semantic transition summaries through bounded surfaces such as:
- `doctor`
- `causal_status`

#### Slice 3: transition-backed local history

Where lawful, persist richer semantic transition records as bounded
local `artifact_history` instead of only coarse checkout-boundary
movement.

## Provenance honesty boundary

Semantic transition summaries may later help causal slicing, but they
are not themselves collapse-admitted explanation.

The product must keep these layers distinct:
- live semantic transition meaning
- persisted local `artifact_history`
- canonical provenance
- canonical structural truth

## Hook/bootstrap relation

The hook/bootstrap seam remains required, but it is not sufficient by
itself. Hook-observed events improve lifecycle authority; richer
semantic transitions still need repo-state and index interpretation on
top.

This cycle should make explicit:
- what target-repo hooks make more lawful
- what semantic meanings still come from repo/index interpretation
- what Graft can only call `unknown` without stronger evidence
