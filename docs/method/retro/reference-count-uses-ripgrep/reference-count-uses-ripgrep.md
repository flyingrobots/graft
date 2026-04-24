# Retro: reference-count-uses-ripgrep

## What shipped

Both consumers of reference-count.ts migrated to WARP graph queries:
- structural-review: cycle 8 (warp-reference-count.ts)
- structural-blame: this session (warp-structural-blame.ts)

reference-count.ts (ripgrep approach) is now dead code with no
active consumers. It remains in the codebase but is not called.

## Status

Resolved across two cycles. No remaining consumers use ripgrep
for reference counting.
