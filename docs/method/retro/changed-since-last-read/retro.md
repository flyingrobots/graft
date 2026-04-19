---
title: "Retrospective — Cycle 0005: Changed Since Last Read"
---

# Retrospective — Cycle 0005: Changed Since Last Read

**Outcome:** Hill met.
**Witness:** Structural diff returned on changed file — added
symbols, changed signatures, unchanged count.

## Playback

```text
First read: projection: content
Second read (file changed):
  projection: diff | reason: CHANGED_SINCE_LAST_READ
  added: farewell (function)
  changed: greet — gained parameter "title: string"
  unchangedCount: 1 (VERSION)
Third read (unchanged): projection: cache_hit
changed_since (unchanged): status: unchanged
changed_since (never read): status: no_previous_observation
```

All three re-read paths now covered:
- Unchanged → cache_hit (cycle 0003)
- Changed → structural diff (this cycle)
- Never read → normal safe_read

## Drift check

- Updated cycle 0003's cache test (changed files now return diff,
  not content). This is correct behavior evolution, not drift.
- Tool count grew from 8 to 9 (changed_since added). Updated
  existing tool-count assertions.

## What went well

- First cycle on a feature branch. RED pushed with failing tests.
  No pre-push friction.
- The diff is genuinely useful. "greet gained parameter title" is
  infinitely more informative than a line diff or full re-read.
- diffOutlines is ~70 lines, pure function, easy to test.

## What to improve

- Symbol matching is by name only. A renamed function shows as
  one removal + one addition. True identity tracking needs WARP.
