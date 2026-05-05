---
title: "Symbol history timeline"
feature: structural-metrics
kind: trunk
legend: WARP
lane: v0.8.0
priority: 4
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "code_show (shipped)"
  - "Worldline seek API (shipped)"
  - "Commit→sym edges with signatures (shipped via indexHead reconciliation)"
acceptance_criteria:
  - "`graft symbol history <symbol> [--path <path>]` returns the indexed WARP history for a symbol"
  - "Each version includes signature and presence/absence facts from the existing blame model"
  - "Output is ordered chronologically by commit"
  - "Detects when a symbol was added, changed, or removed across the timeline"
blocking:
  - WARP_temporal-structural-search
---

# Symbol history timeline

`code_show(symbol, history: true)` — every version of a function
across commits. Walk the worldline, observe the symbol at each
tick, collect signature changes, line range shifts, and presence.

Structural git log for a single symbol. No other tool does this.

## Implementation path

1. Resolve the symbol to its `sym:` node ID via `code_find`
2. Walk commit nodes in chronological order on the worldline
3. For each commit, check for `adds`/`changes`/`removes` edges
   pointing at the target sym node
4. Collect: signature, startLine/endLine, exported flag, and
   the nature of the change (added, changed, removed)
5. Return as an ordered timeline array

The infrastructure is fully in place. `indexHead` emits commit→sym
edges labeled `adds`/`changes`/`removes` with signature metadata.
The worldline seek API provides ordered commit traversal. This is
purely orchestration over existing data.

## Related cards

- **WARP_dead-symbol-detection**: Both walk commit→sym edges.
  Dead-symbol is a specific query ("removed and never re-added");
  timeline is the general case ("show me everything"). Neither
  requires the other — they share infrastructure but answer
  different questions.
- **WARP_codebase-entropy-trajectory**: Entropy works at the
  aggregate level (counts across all symbols). Timeline works at
  the individual symbol level. Different granularity, no dependency.

## No dependency edges

Standalone. All prerequisites are shipped and no other card
requires per-symbol version history as a hard prerequisite.

## Effort rationale

Small. The data model exists, the traversal API exists, the edges
exist. This is a new query pattern over existing graph data —
essentially a filtered walk with collection.

## Implementation status

Shipped in `cycle/CORE_structural-test-coverage-map`.

The first slice exposes `graft symbol history <symbol> [--path <path>]`
as a timeline-first human renderer over the existing `graft_blame`
operation. JSON intentionally keeps the `graft.cli.symbol_blame` schema
so symbol history and symbol blame do not drift into parallel wire
formats for the same provenance truth.
