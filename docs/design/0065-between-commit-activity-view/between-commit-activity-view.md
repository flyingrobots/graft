---
title: "Between-commit activity view"
legend: "SURFACE"
cycle: "0065-between-commit-activity-view"
source_backlog: "docs/method/backlog/asap/SURFACE_between-commit-activity-view.md"
---

# Between-commit activity view

Source backlog item: `docs/method/backlog/asap/SURFACE_between-commit-activity-view.md`
Legend: SURFACE

## Sponsors

- Human: Backlog operator
- Agent: Implementation agent

## Hill

Ship the first honest human-facing surface for bounded between-commit
activity so a human can ask "what happened between the last Git commit
and now?" and get an inspectable answer without reading chat logs,
raw receipts, or internal daemon state.

## Playback Questions

### Human

- [ ] If a human asks what happened between the last Git commit and
      now, does Graft provide a bounded activity view instead of
      requiring raw chat-log reconstruction?
- [ ] Does the first version stay explicit that it is bounded local
      `artifact_history`, not canonical provenance?
- [ ] Does the view group recent reads, writes, stages, attaches, and
      semantic transitions around the current causal workspace and
      staged target when possible?
- [ ] If the anchor to the last Git commit is weak or unavailable,
      does the view say so explicitly instead of faking a complete
      since-commit story?
- [ ] When the current workspace is shared, overlapping, divergent, or
      otherwise degraded, does the activity view preserve that context
      so humans do not over-trust the summary?

### Agent

- [ ] Is the first-release contract explicit about truth class,
      boundedness, ordering, grouping, and degradation rules?
- [ ] Is it explicit which existing substrates feed the view:
      persisted local history, attribution, staged-target state,
      overlay footing, semantic transitions, and repo concurrency?
- [ ] Does the cycle keep raw receipts, full chat transcript replay,
      canonical provenance, and causal collapse out of scope?
- [ ] Is it explicit that the first implementation may ship as one
      bounded machine-readable surface before CLI / IDE wrappers are
      expanded?
- [ ] Does the cycle preserve compatibility with later causal-slice /
      collapse work without pretending that admission exists today?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture:
  - answer the human question first: "what happened since this line of
    work started from the current commit anchor?"
  - present grouped summaries before individual events
  - prefer short event labels like `read`, `write`, `stage`, `attach`,
    and `transition` over internal store terminology
- Non-visual or alternate-reading expectations:
  - the first version must be legible in bounded JSON and linear text
  - grouping must survive screen-reader order without timeline charts
  - degraded or unknown posture must be stated textually, not only by
    omission

## Localization and Directionality

- Locale / wording / formatting assumptions:
  - human wording should center "activity", "line of work",
    "checkpoint", "stage", and "transition"
  - the surface must distinguish "bounded local history" from
    "canonical provenance" in simple language
- Logical direction / layout assumptions:
  - ordering should be anchor first, current workspace next, grouped
    events after that, then explicit degraded reasons
  - no meaning should depend on left/right timeline visuals

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents:
  - current truth class is `artifact_history`
  - current anchor posture is `head_commit` or explicit `unknown`
  - grouping order and event window are bounded and inspectable
  - event summaries name source layers and attribution confidence
  - same-repo concurrency / transition posture is carried through, not
    silently flattened away
- What must be attributable, evidenced, or governed:
  - anchor evidence back to current repo state when available
  - event summaries back to persisted local-history records
  - actor attribution back to bounded evidence and confidence
  - degraded reasons like `local_edit_watchers_absent`,
    `shared_worktree`, `overlapping_actors`, `divergent_checkout`, or
    `anchor_unknown`

## Non-goals

- [ ] Ship canonical provenance or causal-collapse views in this cycle.
- [ ] Replay raw chat transcripts or internal daemon logs directly.
- [ ] Promise complete local edit capture when only between-tool-call
      inference exists.
- [ ] Require a GUI or IDE timeline before the first useful release.
- [ ] Solve full search / filtering / cursor pagination over all local
      history.

## Backlog Context

Humans should be able to ask:

"What happened between the last Git commit and now?"

Graft is increasingly good at tracking bounded local `artifact_history`,
causal workspace footing, attribution, and semantic transitions, but
that information is still exposed mostly through agent-oriented MCP
surfaces and debugging views. We need an explicit human-facing surface
that turns the between-commit activity stream into something inspectable
without requiring raw chat logs or deep tool spelunking.

The first version should stay honest:
- bounded local `artifact_history`, not canonical provenance
- recent reads, writes, stages, attaches, and semantic transitions
- grouped by active causal workspace and staged target where possible
- explicit `unknown` / degraded posture when evidence is incomplete

Potential surfaces:
- bounded MCP `activity_view`
- thin CLI wrapper later (`graft activity` or similar)
- IDE timeline / activity panel later

Why it matters:
- humans need to audit agent work without reading the entire chat or
  reconstructing history from raw receipts
- humans also need a resume surface for their own interrupted work, not
  just an agent-debugging view
- this is the most direct human-facing payoff from the local
  `artifact_history`, attribution, overlay, and semantic-transition
  work already shipping
- it creates the bridge from current bounded local history to future
  causal-slice / collapse views

Related:
- `docs/method/backlog/cool-ideas/CORE_structural-session-replay.md`
- `docs/method/backlog/cool-ideas/SURFACE_active-causal-workspace-status.md`
- `docs/method/backlog/cool-ideas/WARP_causal-blame-for-staged-artifacts.md`
- `docs/method/backlog/cool-ideas/CORE_git-graft-enhance.md`
- `docs/method/backlog/cool-ideas/SURFACE_ide-native-graft-integration.md`

Effort: M

## Problem framing

`0060` through `0064` produced most of the substrate the release needs:

- persisted local `artifact_history`
- attribution
- staged-target summaries
- reactive workspace overlay footing
- semantic transition meaning
- same-repo concurrency posture

But the product is still skewed toward agent/debug surfaces. Humans can
inspect pieces of the truth through `doctor`, `causal_status`, and
`causal_attach`, yet there is no single bounded answer to the human
question "what happened between the last Git commit and now?"

That is now the most valuable release-facing gap.

## Proposed first-release contract

### Truth class and anchor

- the view reports bounded local `artifact_history`
- it may anchor to the current `HEAD` commit when that anchor is
  available and meaningful
- if the anchor is weak or unavailable, the surface must say
  `anchor_unknown` or equivalent instead of implying a full
  commit-to-now record

### Minimum content model

The first useful view should include:

1. current workspace / causal workspace summary
2. current staged-target summary when present
3. recent grouped events:
   - `read`
   - `write`
   - `stage`
   - `attach`
   - `transition`
4. current degraded reasons and concurrency posture

### Ordering and grouping rules

- anchor and active workspace first
- staged target next when present
- semantic transitions next because they change how the rest of the
  activity should be read
- remaining recent events grouped by causal workspace and recency
- raw receipts stay out of the first surface

### Release leaning

The first implementation may ship as one bounded machine-readable
surface before CLI / IDE wrappers are expanded. The important thing is
the truth model, not the wrapper.

That means the first release can be valuable if it gives humans an
inspectable bounded answer, even if the earliest transport is still a
machine-readable tool result.

This cycle stays compatible with later causal-slice / collapse views by
keeping the current surface firmly in local `artifact_history`. It does
not pretend to admit the whole session or produce canonical provenance
today.
