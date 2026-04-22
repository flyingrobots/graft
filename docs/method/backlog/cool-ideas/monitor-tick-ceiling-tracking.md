---
title: MonitorTickWorkerJob could track tick ceiling for incremental re-indexing
legend: CORE
lane: cool-ideas
effort: S
blocking:
  - WARP_background-indexing
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Monitor tick worker job (shipped)"
acceptance_criteria:
  - "MonitorTickWorkerJob compares current headSha with the last indexed commit sha before indexing"
  - "When headSha matches the last indexed commit, indexHead is skipped entirely"
  - "When headSha differs, full indexHead runs as before"
  - "Monitor tick cost is near-zero when the repo is idle (no new commits)"
  - "A test verifies that consecutive ticks with the same HEAD do not re-index"
---

## Idea

Currently `indexHead` re-indexes ALL files at HEAD on every tick. The
monitor could track the last WARP tick ceiling and skip re-indexing if
HEAD hasn't changed (same sha as last indexed commit).

This would make the monitor near-zero-cost when the repo is idle.

## How

- Compare `headSha` with the commit node from the last tick
- If identical, skip indexing entirely
- If different, run full indexHead (still no commit walking)
