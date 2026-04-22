---
title: "Rewrite structural-blame to use WARP worldline provenance"
legend: CORE
release: "v0.7.0"
lane: v0.7.0
---

# Rewrite structural-blame to use WARP worldline provenance

Source: decomposed from CORE_rewrite-operations-for-warp-queries

## Current state

`structural-blame` is a pure function that takes pre-fetched symbol
history and commit metadata. The MCP tool handler fetches this data
via `commitsForSymbol()` + `getCommitMeta()` per commit.

## Target state

Use `worldline().seek()` to trace a symbol's provenance through ticks.
Use `ProvenanceIndex.patchesFor()` for last-touch detection instead of
walking the full commit history.

## Available APIs

- `ProvenanceIndex` class with `patchesFor()`, `has()`
- `Worldline.seek()` for time-travel to specific ticks
- `Worldline.getNodeProps()` for reading sym state at a point in time

Effort: M
