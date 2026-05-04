---
title: "Symbol history timeline"
feature: structural-metrics
kind: trunk
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
blocking:
  - WARP_temporal-structural-search
---

# Symbol history timeline

`code_show(symbol, history: true)` — every version of a function
across commits. Walk the worldline, observe the symbol at each
tick, collect signature changes, line range shifts, and presence.

Structural git log for a single symbol. No other tool does this.

## Implementation path

Surface-completion slice:

1. Keep the shipped `symbolTimeline(ctx, name, filePath?)` query as the
   graph read primitive.
2. Add `history: true` to MCP `code_show`.
3. Add `--history` to `graft symbol show`.
4. Return ordered WARP timeline entries with commit SHA, tick, change
   kind, presence, signature, line range, and path.
5. Preserve `.graftignore` refusal before returning symbol history.

The core infrastructure is already in place. `indexHead` emits
commit→sym edges labeled `adds`/`changes`/`removes` with signature
metadata, and `symbolTimeline` reconstructs ordered history from WARP
provenance patches.

Rename truth: this slice does not claim canonical rename continuity.
The current address-level timeline reports `added`, `changed`, and
`removed` for `sym:<path>:<name>`. Cross-name continuity belongs to the
canonical symbol identity model, not to this surface wrapper.

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
