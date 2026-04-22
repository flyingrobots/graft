---
title: "Rewrite structural-review to use WARP graph queries"
legend: "CORE"
cycle: "CORE_rewrite-structural-review-to-use-warp-graph-queries"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-structural-review-to-use-warp-graph-queries.md"
---

# Rewrite structural-review to use WARP graph queries

Source backlog item: `docs/method/backlog/v0.7.0/CORE_rewrite-structural-review-to-use-warp-graph-queries.md`
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

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`structural-review` uses `countSymbolReferences` from `reference-count.ts`
which shells out to ripgrep/grep to count how many files reference a symbol.

## Target state

Replace ripgrep shelling with WARP graph traversal. `indexHead` already
emits `resolves_to` and `references` edges via `resolveImportEdges`.
Use `QueryBuilder.incoming(\"references\")` to count references natively.

## Available APIs

- `app.worldline().query().match(symId).incoming(\"references\").run()`
- `Observer.query().match(ids).select([\"id\", \"props\"]).run()`

Effort: S
