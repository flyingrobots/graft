---
title: Temporal structural search
requirements:
  - WARP Level 1 indexing (shipped)
  - Symbol history timeline (backlog)
  - Worldline seek API (shipped)
acceptance_criteria:
  - "Answers temporal queries: 'when did this function first appear?', 'has this class ever had method X?'"
  - Returns results across all of history, not just a single ref
  - Queries operate on structural meaning (symbol identity), not text patterns
  - Performance is bounded by worldline size, not raw git history size
---

# Temporal structural search

"When did this function FIRST appear?"
"Has this class EVER had a method called handle?"
"Show me every version of this interface across the last year."

Temporal queries across structure. git grep searches text at one
ref. WARP searches meaning across all of history.

Depends on: WARP Level 1 (shipped), symbol history timeline
(backlog).
