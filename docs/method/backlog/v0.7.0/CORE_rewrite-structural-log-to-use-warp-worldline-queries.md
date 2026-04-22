---
title: "Rewrite structural-log to use WARP worldline queries"
feature: structural-queries
kind: trunk
legend: CORE
release: "v0.7.0"
lane: v0.7.0
requirements:
  - "indexHead emits commit nodes with tick property (shipped)"
  - "Worldline.seek() API available in git-warp (shipped)"
acceptance_criteria:
  - "structural-log uses worldline seek instead of git log SHA walking"
  - "Zero GitClient calls for commit enumeration in the operation"
---

# Rewrite structural-log to use WARP worldline queries

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`structural-log` walks git log SHAs via GitClient, calls
`symbolsForCommit()` per commit, then transforms results in pure TS.

## Target state

Use `worldline().seek()` to walk WARP ticks instead of git log SHAs.
Query symbol changes at each tick via `query().match(\"commit:*\").select(...)`.

## Available APIs

- `app.worldline().seek({ kind: 'coordinate', tick: N })`
- `Worldline.query().match(\"commit:*\").select([\"id\", \"props\"]).run()`
- `Observer.traverse.bfs(commitId, { labelFilter: \"adds\" })`

Effort: M
