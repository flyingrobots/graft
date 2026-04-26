---
title: "Use ProvenanceIndex for structural-blame last-touch provenance"
feature: structural-queries
kind: trunk
legend: CORE
cycle: "CORE_rewrite-structural-blame-to-use-warp-worldline-provenance"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.md"
lane: v0.7.0
requirements:
  - "indexHead emits commit nodes with tick property (shipped)"
  - "ProvenanceIndex class available in git-warp (shipped)"
  - "Worldline.seek() API available in git-warp (shipped)"
acceptance_criteria:
  - "structural-blame traces symbol provenance through WARP ticks"
  - "Last-touch detection uses ProvenanceIndex, not full commit walking"
  - "Zero GitClient calls for commit history in the operation"
blocking:
  - CORE_git-graft-enhance
---

# Use ProvenanceIndex for structural-blame last-touch provenance

Source backlog item: `docs/method/backlog/v0.7.0/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.md`
Legend: CORE

## Hill

Ship the remaining structural-blame provenance slice by making symbol
timeline hydration trace WARP provenance patches through worldline ticks
instead of treating patch payload parsing as the product boundary. The
cycle is complete when `graft_blame` still makes zero GitClient calls,
last-touch detection is derived from ProvenanceIndex patch membership,
symbol version properties are read from a WARP worldline pinned at the
touching tick, and `CORE_git-graft-enhance` is no longer blocked by
this card.

## Playback Questions

### Human

- [ ] Can I run structural blame on a symbol and see creation, last
      signature change, change count, and reference count after multiple
      indexed commits?
- [ ] Does the result come from WARP provenance rather than walking git
      commit history?

### Agent

- [ ] Does symbol timeline lookup ask WARP provenance for patches that
      touched a symbol id?
- [ ] Does symbol timeline hydration seek a worldline to the touching
      patch tick before reading symbol properties?
- [ ] Does the structural-blame MCP path still make zero GitClient
      calls?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: blame output remains
  chronological and symbol-scoped, with explicit creation and last
  signature-change fields.
- Non-visual or alternate-reading expectations: no terminal-only
  rendering is introduced; MCP JSON fields remain structured and
  schema-validated.

## Localization and Directionality

- Locale / wording / formatting assumptions: commit SHAs, ticks, symbol
  names, and file paths remain locale-neutral identifiers.
- Logical direction / layout assumptions: history remains ordered by
  WARP tick ascending.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: provenance patch
  selection, tick ordering, and worldline property hydration must be
  deterministic and separately testable.
- What must be attributable, evidenced, or governed: every version in
  structural-blame history must map back to a commit-to-symbol
  `adds`/`changes`/`removes` edge from an indexed WARP patch.

## Non-goals

- [ ] No `git graft enhance` implementation in this cycle.
- [ ] No new WARP LSP enrichment.
- [ ] No governed write/edit work.
- [ ] No broad graph materialization policy changes.
- [ ] No live-checkout playback or tests that use the repository under
      `/Users/james/git/graft` as subject data.

## Relevance Check

Classification: partially satisfied and still relevant.

Already real:

- `graft_blame` routes through `structuralBlameFromGraph`.
- `structuralBlameFromGraph` composes WARP symbol history and WARP
  reference counting.
- The MCP execution path already avoids GitClient commit-history calls.
- `symbolTimeline` already uses WARP core provenance patch lookup
  instead of walking git commits.

Remaining slice:

- make the provenance boundary explicit in the implementation and tests
- hydrate symbol version properties through `worldline().seek(...)`
  pinned to each touching patch tick
- keep patch payload inspection limited to identifying the
  commit-to-symbol change edge and tick, not as the source of current
  symbol properties
- update tests so structural-blame provenance scenarios use temp git
  repos and isolated GitClient behavior only

## Backlog Context

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`graft_blame` now calls `structuralBlameFromGraph(ctx, symbolName,
filePath)` from `src/warp/warp-structural-blame.ts`. It composes
`symbolTimeline` and WARP-based reference counting, and makes zero
GitClient calls on the MCP execution path.

The remaining gap is narrower than the original rewrite card:
last-touch provenance comes from `symbolTimeline`, not git-warp's
`ProvenanceIndex`. That is accurate enough for the current tool shape
but not the intended provenance primitive.

## Target state

Use `worldline().seek()` to trace a symbol's provenance through ticks.
Use `ProvenanceIndex.patchesFor()` for last-touch detection instead of
walking the full commit history.

## Available APIs

- `ProvenanceIndex` class with `patchesFor()`, `has()`
- `Worldline.seek()` for time-travel to specific ticks
- `Worldline.getNodeProps()` for reading sym state at a point in time

Effort: M
