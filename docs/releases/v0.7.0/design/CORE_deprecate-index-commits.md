---
title: "Remove legacy commit-walking indexer"
legend: "CORE"
cycle: "CORE_deprecate-index-commits"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/CORE_deprecate-index-commits.md"
---

# Remove legacy commit-walking indexer

Source backlog item: `docs/method/backlog/v0.7.0/CORE_deprecate-index-commits.md`
Legend: CORE

## Hill

TBD

## Playback Questions

### Human

- [ ] TBD

### Agent

- [ ] TBD

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: TBD
- Non-visual or alternate-reading expectations: TBD

## Localization and Directionality

- Locale / wording / formatting assumptions: TBD
- Logical direction / layout assumptions: TBD

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: TBD
- What must be attributable, evidenced, or governed: TBD

## Non-goals

- [ ] TBD

## Backlog Context

Source: WARP model alignment audit (2026-04-20)

## What's being removed

- `src/warp/indexer.ts` — the commit walker
- `src/warp/indexer-git.ts` — commit enumeration helpers
- `src/warp/indexer-graph.ts` — per-commit sym: emission
- `src/warp/indexer-model.ts` — PreparedChange type
- `src/warp/symbol-identity.ts` — cross-commit identity tracking
- `src/warp/reference-count.ts` — ripgrep/grep reference counting

## Why

The old model reimplements history tracking that WARP provides natively.
`indexHead` replaces it with a simpler model: parse HEAD, emit one atomic
patch. WARP handles history via ticks, worldlines, and provenance.

## Prerequisite

- Widen WarpHandle port to expose query()/traverse/worldline()
- Update CLI index-cmd to call indexHead
- Update monitor-tick-job to call indexHead
- Rewrite structural-queries.ts to use WARP native queries

## Blocked by

- Port widening (must happen first)
- structural-queries rewrite (consumers depend on it)

Effort: L
