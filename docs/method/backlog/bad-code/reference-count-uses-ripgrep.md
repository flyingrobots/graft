---
title: reference-count.ts uses ripgrep/grep instead of WARP-native queries
legend: CLEAN_CODE
effort: M
requirements:
  - "Cross-file reference edges in WARP graph (shipped via indexHead)"
acceptance_criteria:
  - "reference-count.ts replaced with WARP graph query for reference counting"
  - "No ripgrep/grep subprocess spawning for symbol references"
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
