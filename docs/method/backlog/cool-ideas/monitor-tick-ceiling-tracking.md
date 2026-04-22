---
title: MonitorTickWorkerJob could track tick ceiling for incremental re-indexing
legend: CORE
effort: S
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
