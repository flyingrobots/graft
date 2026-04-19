---
title: "v0.7.0 structural history"
cycle: "CORE_v070-structural-history"
design_doc: "docs/design/CORE_v070-structural-history.md"
outcome: hill-met
drift_check: yes
---

# v0.7.0 structural history Retro

## Summary

Hill met. Five structural analysis tools shipped — graft log, blame,
review, churn, and exports. Each delivered as operation + CLI + MCP
tool + tests. Two shared infrastructure modules (commit-symbol
queries, reference counting) power all five.

## What shipped

### Shared infrastructure (AC1 — 2 parallel agents)

- **structural-queries.ts**: `symbolsForCommit` and `commitsForSymbol`
  — WARP graph traversals using observer lenses with tick-based
  ceiling snapshots for removal detection
- **reference-count.ts**: `countSymbolReferences` — ripgrep
  word-boundary search with DI via GitClient + ProcessRunner

### Features (AC2 — 4 parallel agents)

- **graft log**: per-commit structural changelog
- **graft blame**: symbol lifecycle (creation, last change, history,
  references)
- **graft review**: structural vs formatting file categorization,
  breaking change detection with impact analysis
- **graft churn**: maintenance hotspot ranking by symbol change
  frequency
- **graft exports**: export surface diff with semver impact
  classification (major/minor/patch/none)

## What surprised us

1. **WARP removeNode deletes edges** — the `removes` edges between
   commits and symbols are invisible on the materialized frontier
   because removing a node also removes its edges. T1 had to use
   tick-based ceiling snapshots (time travel) to detect removals
   by diffing symbol sets before and after a commit.

2. **TypeScript stale file detection** — after merging shared files
   from 4 parallel agents, `pnpm typecheck` reported 6 errors because
   TypeScript didn't re-parse `capabilities.ts` (unchanged mtime).
   Adding a blank line forced the re-parse. Filed as a lesson: always
   touch merged files.

3. **Merge agent race with worktree cleanup** — the merge agent's
   edits to shared files were lost when `git worktree remove` ran
   before `git add`. The worktree contained the merged version but
   cleanup deleted it. Required a second merge pass.

4. **Hex architecture worked beautifully** — all five operations
   accept injected query functions instead of importing WARP directly.
   The eslint `no-restricted-imports` rule caught the one attempt to
   import WARP from the operations layer. The boundary is real.

## Execution

- AC1: 2 agents, ~6 min wall clock (infra)
- AC2: 4 agents, ~20 min wall clock (features)
- Integration: 1 merge agent + manual fix
- Total: 6 agents deployed across 2 phases

## Metrics

- **New operations**: 7 (5 features + 2 infrastructure)
- **New MCP tools**: 5
- **New CLI commands**: 5
- **New test files**: 7
- **Witness tests**: 10/10 passing
- **Drift**: zero
