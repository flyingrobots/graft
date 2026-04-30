---
title: "Rewrite structural-log to use WARP worldline queries"
feature: structural-queries
kind: trunk
legend: CORE
release: "v0.7.0"
lane: graveyard
superseded: true
superseded_reason: "Absorbed by CORE_rewrite-structural-log, which shipped WARP commit-node queries rather than literal worldline.seek traversal"
requirements:
  - "indexHead emits commit nodes with tick property (shipped)"
  - "Worldline.seek() API available in git-warp (shipped)"
acceptance_criteria:
  - "structural-log uses worldline seek instead of git log SHA walking"
  - "Zero GitClient calls for commit enumeration in the operation"
---

# Rewrite structural-log to use WARP worldline queries

## Disposition

Superseded as a standalone backlog card by
`docs/method/retro/CORE_rewrite-structural-log/CORE_rewrite-structural-log.md`.
The shipped implementation uses WARP commit-node queries and edge
traversal rather than Git log SHA walking. It did not use
`worldline().seek()` literally; the retro records that design drift.

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`graft_log` now calls `structuralLogFromGraph(ctx, options?)` from
`src/warp/warp-structural-log.ts`. It walks WARP commit nodes in
reverse tick order and traverses commit-symbol edges. Zero GitClient
calls remain on the MCP execution path.

The remaining `since` schema drift is tracked separately in
`docs/method/backlog/bad-code/structural-log-stale-since-param.md`.

## Target state

Use `worldline().seek()` to walk WARP ticks instead of git log SHAs.
Query symbol changes at each tick via `query().match(\"commit:*\").select(...)`.

## Available APIs

- `app.worldline().seek({ kind: 'coordinate', tick: N })`
- `Worldline.query().match(\"commit:*\").select([\"id\", \"props\"]).run()`
- `Observer.traverse.bfs(commitId, { labelFilter: \"adds\" })`

Effort: M
