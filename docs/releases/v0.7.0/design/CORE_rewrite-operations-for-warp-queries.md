---
title: "Rewrite structural operations to use WARP queries"
legend: "CORE"
cycle: "CORE_rewrite-operations-for-warp-queries"
release: "v0.7.0"
source_backlog: "docs/method/backlog/v0.7.0/CORE_rewrite-operations-for-warp-queries.md"
---

# Rewrite structural operations to use WARP queries

Source backlog item: `docs/method/backlog/v0.7.0/CORE_rewrite-operations-for-warp-queries.md`
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

The operations layer (structural-log, structural-churn, structural-blame)
uses per-commit callbacks and manual accumulation. These should become
WARP query calls.

## structural-log

- **Now**: walks git log SHAs, calls `querySymbols(sha)` per commit
- **Should**: `worldline().backward().query().match("sym:*").where({filePath}).run()`

## structural-churn

- **Now**: iterates commits, accumulates symbol change counts
- **Should**: `query().match("sym:*").aggregate({changeCount}).run()`

## structural-blame

- **Now**: pre-computed per-symbol/per-commit metadata
- **Should**: `worldline().provenance(symbolId)` for last touch

## structural-review

- **Now**: uses ripgrep `countSymbolReferences` for impact counting
- **Should**: `query(sym).incoming("references").count()`

Each rewrite is a separate cycle. This card tracks the overall effort.

Effort: L
