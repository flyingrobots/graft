---
title: "Verification Witness for Cycle 91"
---

# Verification Witness for Cycle 91

This witness captures the bounded checks used to close
`0091-canonical-symbol-identity-across-files-and-commits`.

## Verified Commands

```text
npm test -- --run test/unit/warp/indexer.test.ts test/unit/mcp/precision.test.ts test/unit/contracts/output-schemas.test.ts tests/playback/0091-canonical-symbol-identity-across-files-and-commits.test.ts
npm run lint
npm run typecheck
method_drift 0091-canonical-symbol-identity-across-files-and-commits
```

## What These Checks Prove

- the WARP indexer preserves canonical `sid:*` identity across same-file
  renames during incremental indexing
- the WARP indexer preserves canonical `sid:*` identity across git-reported
  file renames
- indexed precision reads expose `identityId`
- the indexer no longer depends on `materializeReceipts()` for commit-ceiling
  discovery
- the cycle playback questions are witnessed exactly and drift-clean

## Notes

- This witness is intentionally bounded to the files and surfaces touched by
  `0091`.
- It does not claim a clean full-repo `vitest run`, and it does not treat
  unrelated suite failures as evidence against this slice.
