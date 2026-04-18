---
title: "RotatingNdjsonLog can erase entire log on oversized entry"
legend: CLEAN_CODE
lane: bad-code
---

# RotatingNdjsonLog can erase entire log on oversized entry

Source: v0.6.0 code review (Codex Level 10)

When rotation triggers, the file is split into lines and kept via `lines.slice(Math.ceil(lines.length / 2))`. If one oversized entry constitutes the entire file content, this produces an empty array, and the file is rewritten to just `"\n"`. All prior log entries are lost.

Files: `src/adapters/rotating-ndjson-log.ts:47,57`

Desired fix: rotation should never produce an empty file. At minimum, keep the last N entries or the last N bytes. Consider truncating the oversized entry instead of discarding everything.

Effort: S
