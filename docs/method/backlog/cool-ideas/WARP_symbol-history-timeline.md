---
title: "Symbol history timeline"
legend: WARP
lane: cool-ideas
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "code_show (shipped)"
  - "Worldline seek API (shipped)"
  - "Commit→sym edges with signatures (shipped via indexHead reconciliation)"
acceptance_criteria:
  - "code_show with history flag returns every version of a symbol across commits"
  - "Each version includes signature, line range, and presence/absence"
  - "Output is ordered chronologically by commit"
  - "Detects when a symbol was added, renamed, or removed across the timeline"
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
