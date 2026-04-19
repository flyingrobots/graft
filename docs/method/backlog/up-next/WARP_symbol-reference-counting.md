---
title: "Symbol reference counting"
legend: WARP
lane: up-next
---

# Symbol reference counting

Query: "how many files reference symbol X?"

Used by structural blame (show impact) and structural review (breaking change impact analysis).

## Approach

1. First try WARP edges if available (fastest, indexed)
2. Fall back to `code_refs` infrastructure (ripgrep text search)
3. Return: count of referencing files, list of file paths

## Location

`src/warp/reference-count.ts` or extend existing `src/mcp/tools/precision.ts` infrastructure.

## Depends on

code_refs (shipped), WARP Level 1 (shipped).
