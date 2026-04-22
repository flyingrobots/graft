---
title: "Symbol history timeline"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "code_show (shipped)"
  - "Worldline seek API (shipped)"
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

Depends on: WARP Level 1 (shipped), code_show (cycle 0024).
