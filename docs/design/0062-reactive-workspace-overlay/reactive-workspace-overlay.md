---
title: "Reactive workspace overlay"
legend: "WARP"
cycle: "0062-reactive-workspace-overlay"
source_backlog: "docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md"
---

# Reactive workspace overlay

Source backlog item: `docs/method/backlog/up-next/WARP_reactive-workspace-overlay.md`
Legend: WARP

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Make the workspace overlay a first-class reactive product concept
instead of something only inferred opportunistically between tool
calls, while keeping it anchored to checkout epochs and explicit Git
transition boundaries.

## Playback Questions

### Human

- [ ] After local edits or checkout-boundary transitions, can a human
      inspect the active workspace and see an explicit reactive overlay
      footing instead of a silent best-effort guess?
- [ ] When a branch switch or similar Git transition occurs, does Graft
      show a lawful overlay/session boundary instead of smearing one
      line of work across incompatible bases?
- [ ] Does Graft distinguish reactive live overlay state from canonical
      commit-worldline truth in bounded machine-readable surfaces?
- [ ] When Git hooks or equivalent transition surfaces are absent, does
      Graft degrade honestly instead of pretending full lifecycle
      coverage?

### Agent

- [ ] Are the overlay identities explicit enough to implement without
      churn: `repoId`, `worktreeRoot`, `checkoutEpochId`,
      `workspaceOverlayId`, and their relation to `causalSessionId` /
      `strandId`?
- [ ] Is the precedence between watcher-style local edit signals and
      Git transition signals explicit enough that agents do not invent
      their own lifecycle rules?
- [ ] Does the cycle keep reactive overlay truth separate from
      canonical provenance and collapse-admitted explanation?
- [ ] Is the target-repo hook/bootstrap boundary explicit enough that
      agents know what can be implemented now versus what only becomes
      lawful once hooks are installed?
- [ ] Does the cycle avoid accidentally overcommitting to the deeper
      same-repo concurrent-agent model while still improving single
      active-workspace honesty?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - say "what live workspace am I looking at right now?" before saying
    overlay, footing, or reactive substrate
  - branch switch and checkout transition should read like plain
    product boundaries, not watcher jargon
- Non-visual or alternate-reading expectations:
  - overlay footing, checkout epoch, and degraded hook posture must be
    inspectable through bounded JSON and short textual summaries
  - users and agents must be able to tell whether Graft is showing live
    workspace state or canonical historical state without relying on
    diagrams

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - prefer stable terms already in repo truth: `workspace overlay`,
    `checkout epoch`, `transition`, `active causal workspace`
  - "degraded" and `unknown` remain lawful product states
- Logical direction / layout assumptions:
  - transition meaning must survive in linear prose and bounded JSON
  - no dependency on timeline graphics or IDE-specific visuals

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - the current workspace overlay footing
  - whether the current footing is reactive, only inferred, or
    hook-observed for checkout boundaries
  - the active checkout epoch and the last transition that changed it
  - whether Git hooks/bootstrap are installed, absent, or degraded
- What must be attributable, evidenced, or governed:
  - which signals came from Git transitions versus local filesystem
    activity
  - when a branch/checkout transition caused a fork/park/invalidate
    boundary
  - the rule that raw local edit churn must not be replayed as fake
    semantic transition spam
  - the rule that absent hooks constrain product certainty

## Non-goals

- [ ] Implement full strand-aware causal collapse.
- [ ] Solve same-repo multi-agent merge semantics.
- [ ] Solve rename/symbol continuity in this cycle.
- [ ] Require a human-first GUI or IDE integration.
- [ ] Pretend filesystem watcher data alone is sufficient canonical
      evidence for Git lifecycle boundaries.

## Backlog Context

Make the workspace overlay reactive instead of only being inferred
between tool calls.

Scope:
- detect live local edits as they happen
- keep overlay state anchored to checkout epochs
- avoid turning branch switches into raw file-event spam
- stay clearly separate from the canonical commit worldline

Why separate cycle:
- this is where watcher semantics, batching, and repo-transition
  interpretation start to matter directly

Effort: L

## Problem framing

`0060` and `0061` made persisted local `artifact_history` and runtime
attribution inspectable, but they still depend too heavily on
best-effort snapshots taken when tool calls happen.

That leaves a product honesty gap:

- live edits can accumulate before the next bounded surface runs
- checkout/branch transitions are real lifecycle boundaries, but the
  current product still relies mostly on inferred repo-state snapshots
- target-repo hook/bootstrap posture is backlog truth, not yet cycle
  truth

If Graft is going to model meaningful work between hard Git commits,
the live workspace overlay has to become explicit product state rather
than an incidental byproduct of the next read.

## Proposed model

### Reactive overlay footing

Graft should treat the active workspace overlay as a first-class footing
with:

- `repoId`
- `worktreeRoot`
- `checkoutEpochId`
- `workspaceOverlayId`
- current degraded/installed bootstrap posture
- last semantic transition that affected the footing

### Signal hierarchy

The cycle should make one precedence rule explicit:

1. **Git transitions are canonical lifecycle boundaries**
   - checkout, merge, rewrite, and related transitions define footing
     changes when available
   - when installed target-repo hooks observe those transitions, the
     resulting fork/park lifecycle records should carry hook-derived
     evidence instead of relying only on inferred repo snapshots
2. **Reactive local edit signals update the current overlay**
   - local edits can refresh the active overlay without claiming new
     semantic checkout boundaries
3. **Absent hooks reduce certainty**
   - without hook/bootstrap support, Graft may still infer overlay
     change, but must not overclaim complete lifecycle coverage

### Hook/bootstrap relation

This cycle should treat target-repo hook/bootstrap as a required
companion seam, not a distant optional extra.

The core questions are:

- what minimum product hook shim is required for lawful
  checkout-boundary handling
- how `graft init` or equivalent bootstrap should compose with
  `core.hooksPath` and existing repo hooks
- what Graft can still claim honestly when hooks are absent

Initial product seam for this cycle:

- `graft init --write-target-git-hooks` may install the minimum
  transition shims for `post-checkout`, `post-merge`, and
  `post-rewrite`
- bootstrap must preserve external hook scripts instead of overwriting
  them
- installed checkout-boundary hooks improve lifecycle certainty without
  pretending local edit reactivity is solved

### Surfaces for this cycle

1. **Design and contract**
   - define reactive overlay footing and transition rules in repo truth
2. **Bounded inspection**
   - extend bounded surfaces so they can say whether overlay footing is
     reactive, inferred, hook-observed, or degraded
3. **Bootstrap posture**
   - define how target-repo hook installation or absence affects
     product certainty

## Provenance honesty boundary

Reactive overlay truth is still not canonical provenance.

This cycle should strengthen the honesty of live workspace footing and
checkout-boundary handling without pretending that:

- collapse has happened
- all between-commit activity is durably admitted
- filesystem churn alone explains meaning

## Related work

- [SURFACE_target-repo-git-hook-bootstrap.md](/Users/james/git/graft/docs/method/backlog/up-next/SURFACE_target-repo-git-hook-bootstrap.md)
- [WARP_richer-semantic-transitions.md](/Users/james/git/graft/docs/method/backlog/up-next/WARP_richer-semantic-transitions.md)
- [WARP_same-repo-concurrent-agent-model.md](/Users/james/git/graft/docs/method/backlog/up-next/WARP_same-repo-concurrent-agent-model.md)
- [CLEAN_CODE_mcp-repo-state.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-repo-state.md)
- [CLEAN_CODE_mcp-workspace-router-composition.md](/Users/james/git/graft/docs/method/backlog/bad-code/CLEAN_CODE_mcp-workspace-router-composition.md)
