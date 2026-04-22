---
title: reference-count.ts uses ripgrep/grep instead of WARP-native queries
legend: CLEAN_CODE
effort: M
---

## What

`src/warp/reference-count.ts` shells out to ripgrep/grep to count symbol
references across the codebase. This is a legacy approach from before WARP
had cross-file import edges.

## Why it matters

With `indexHead` now emitting `resolves_to` edges for imports, reference
counting could be done via WARP graph traversal instead of spawning
subprocesses. This would be faster, more consistent, and wouldn't require
ripgrep to be installed.

## Consumers

- `src/mcp/tools/structural-blame.ts`
- `src/mcp/tools/structural-review.ts`
