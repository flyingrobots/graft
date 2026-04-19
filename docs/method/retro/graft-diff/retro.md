---
title: "Retrospective — Cycle 0006: graft diff"
---

# Retrospective — Cycle 0006: graft diff

**Outcome:** Hill met.
**Witness:** Structural diff of graft's own commits via MCP tool.

## Playback

```text
graft_diff HEAD~1..HEAD:
  src/git/diff.ts | added
    + interface: ChangedFilesOptions
    + function: getChangedFiles
    + function: getFileAtRef
  src/operations/graft-diff.ts | added
    + interface: FileDiff
    + interface: GraftDiffResult
    + interface: GraftDiffOptions
    + function: emptyDiff
    + function: detectLang
    + function: graftDiff
```

Works across multiple files, detects added/deleted/modified, shows
symbol-level changes with signatures. Non-supported extensions
listed with status but no structural diff.

## Drift check

- Suppressed stderr from `git show` on missing files (noisy but
  harmless `fatal:` messages). Fixed with `stdio: ["pipe", "pipe", "pipe"]`.

## What went well

- Reused `extractOutline` and `diffOutlines` directly — zero new
  parser code needed. The diff primitive from cycle 0005 paid off
  immediately.
- `exactOptionalPropertyTypes` caught two interface mismatches at
  compile time. Strict TS earning its keep.

## What to improve

- The `graft_diff` tool name uses underscore (MCP convention) but
  `git graft diff` would use a hyphen. Decide on naming convention
  before 0.1.0.
