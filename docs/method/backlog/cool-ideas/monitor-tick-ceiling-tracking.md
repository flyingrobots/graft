---
title: "MonitorTickWorkerJob could track tick ceiling for incremental re-indexing"
feature: graph-indexing
kind: trunk
legend: CORE
lane: cool-ideas
effort: S
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Monitor tick worker job (shipped)"
acceptance_criteria:
  - "MonitorTickWorkerJob compares current headSha with the last indexed commit sha before indexing"
  - "When headSha matches the last indexed commit, indexHead is skipped entirely"
  - "When headSha differs, full indexHead runs as before"
  - "Monitor tick cost is near-zero when the repo is idle (no new commits)"
  - "A test verifies that consecutive ticks with the same HEAD do not re-index"
blocking:
  - WARP_background-indexing
---

# MonitorTickWorkerJob could track tick ceiling for incremental re-indexing

## Idea

Currently `indexHead` re-indexes ALL files at HEAD on every tick. The
monitor could track the last WARP tick ceiling and skip re-indexing if
HEAD hasn't changed (same sha as last indexed commit).

This would make the monitor near-zero-cost when the repo is idle.

## How

- Compare `headSha` with the commit node from the last tick
- If identical, skip indexing entirely
- If different, run full indexHead (still no commit walking)

## Implementation path

1. Add a `lastIndexedSha` field to the MonitorTickWorkerJob (or its
   state container). Initialize to `null` on first run.
2. At the start of each tick, resolve current HEAD SHA via git.
3. Compare against `lastIndexedSha`. If equal, skip `indexHead`
   entirely and return early.
4. If different, run `indexHead` as today, then update
   `lastIndexedSha` to the newly indexed SHA.
5. Optionally persist `lastIndexedSha` across MCP server restarts
   (e.g., in the WARP graph metadata or a small state file) so
   the first tick after restart also benefits from ceiling tracking.

## Why this blocks WARP_background-indexing

Background indexing needs to know "where it left off" — the last
indexed SHA is the ceiling from which incremental indexing resumes.
Without this card, background indexing would have no foundation for
delta detection. This card provides the primitive (track last indexed
SHA, skip if unchanged) that background indexing extends into
"index only the commits between ceiling and current HEAD."

## Related cards

- **WARP_background-indexing** (blocking — hard dep): Background
  indexing extends ceiling tracking from "skip or full re-index"
  to "index only the delta since last ceiling." The ceiling is the
  foundation; background indexing is the structure built on it.
  See above.
- **CORE_opt-in-daemon-mode-mcp-bootstrap** (v0.7.0): Daemon mode
  would keep the MCP server alive across sessions, making ceiling
  tracking more valuable (the `lastIndexedSha` persists in memory
  without needing disk persistence). Nice-to-have, not a dependency.

## Effort rationale

Small. The change is localized to MonitorTickWorkerJob: add one
field, one SHA comparison, one conditional skip. No new APIs, no
new data structures, no new edge types. The only design decision
is whether to persist the ceiling across restarts (adds minor
complexity) or accept a full re-index on first tick after restart
(simpler, still a large improvement over re-indexing every tick).
