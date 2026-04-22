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

After this cycle, `indexHead` is the sole indexing path. No code in src/
imports or calls `indexCommits`. The CLI, monitor, and all tests use
`indexHead`. The structural query layer (`symbolsForCommit`,
`commitsForSymbol`) works against `indexHead`-produced graph state.

## Playback Questions

### Human

- [x] Can I run `graft index` and get a valid HEAD snapshot in WARP?
- [x] Does the monitor tick job index HEAD without commit-walking?
- [x] Do structural queries (blame, churn, log) still work end-to-end?

### Agent

- [x] Zero imports of `indexCommits`, `indexer.ts`, `indexer-git.ts`,
      `indexer-graph.ts`, `indexer-model.ts`, or `symbol-identity.ts` in src/?
- [x] All tests pass (`pnpm test` — 1175 passing)?
- [x] Lint clean (`pnpm lint` — zero errors, zero warnings)?
- [x] `indexHead` emits `commit:{sha}` nodes with tick property?
- [x] `indexHead` emits adds/changes/removes edges via prior-state reconciliation?
- [x] `indexHead` emits `startLine`/`endLine` on sym nodes for code_show?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: N/A (infrastructure change, no UI)
- Non-visual or alternate-reading expectations: N/A

## Localization and Directionality

- Locale / wording / formatting assumptions: N/A
- Logical direction / layout assumptions: N/A

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: `indexHead` is
  deterministic — same HEAD always produces the same graph state
- What must be attributable, evidenced, or governed: Each indexHead call
  produces a `commit:{sha}` node with tick, so structural queries can
  attribute changes to specific HEAD snapshots

## Non-goals

- [x] Rewriting structural queries to not need commit nodes (tracked as
      CORE_rewrite-operations-for-warp-queries)
- [x] Replacing `reference-count.ts` ripgrep shelling with WARP queries
      (filed as bad-code card)
- [x] Renaming monitor result fields (`commitsIndexed` → `filesIndexed`)
      across persisted schemas (deferred to avoid 10+ file cascade)

## Backlog Context

Source: WARP model alignment audit (2026-04-20)

## What was removed

- `src/warp/indexer.ts` — the commit walker
- `src/warp/indexer-git.ts` — commit enumeration helpers
- `src/warp/indexer-graph.ts` — per-commit sym emission
- `src/warp/indexer-model.ts` — PreparedChange type, node ID helpers
- `src/warp/symbol-identity.ts` — cross-commit identity tracking
- `src/warp/identity-resolver.ts` — orphaned identity resolver
- `test/unit/warp/indexer.test.ts` — tests for indexCommits
- `tests/playback/0091-canonical-symbol-identity-across-files-and-commits.test.ts`

## What was kept (survivors)

- `src/warp/reference-count.ts` — still used by structural-blame and
  structural-review. Zero indexer dependencies. Filed bad-code card.

## What was relocated

- `getCommitMeta` moved from `indexer-git.ts` → `src/warp/commit-meta.ts`

## What was enhanced

`src/warp/index-head.ts` gained:
- `commit:{sha}` node emission with `tick` property
- `commit→sym` edges (`adds`/`changes`/`removes`) via prior-state
  reconciliation using observer + signature diff
- Outline-based sym emission (`emitOutlineSyms`) with signatures and
  `startLine`/`endLine` from jump tables
- Directory chain emission (inlined from `indexer-graph.ts`)

## Rewired consumers

- `src/cli/index-cmd.ts` — `indexCommits` → `indexHead`
- `src/cli/index-model.ts` — `commitsIndexed`/`patchesWritten` → `filesIndexed`/`nodesEmitted`
- `src/mcp/monitor-tick-job.ts` — `indexCommits` → `indexHead`, simplified
- `src/mcp/tools/structural-blame.ts` — import path fix for `getCommitMeta`
- `src/contracts/output-schema-cli.ts` — CLI output schema updated
- `src/contracts/output-schemas.ts` — CLI output schema updated
- 8 test files migrated to `indexHead`

## Why

The old model reimplements history tracking that WARP provides natively.
`indexHead` replaces it with a simpler model: parse HEAD, emit one atomic
patch. WARP handles history via ticks, worldlines, and provenance.

## Prerequisites (all satisfied)

- ✅ Widen WarpHandle port (CORE_widen-warp-port)
- ✅ Rewrite structural-queries.ts (CORE_rewrite-structural-queries)
- ✅ Fix references.ts getEdges (CORE_references-getEdges-fix)

Effort: L
