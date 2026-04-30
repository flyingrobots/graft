# Retro: CORE_cross-session-resume

## What shipped

`buildSessionResume(options)` computes the structural diff between
a saved HEAD SHA and current HEAD using plumbing-safe git commands
(diff-tree, rev-list).

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Load saved state and receive structural diff | ⚠️ Takes SHA as input, doesn't call state_load |
| Diff includes added/removed/modified symbols | ❌ File-level only, not symbol-level |
| Agents skip re-reading unchanged files | ✅ Changed files list enables this |
| Works across branch switches and merges | ✅ diff-tree handles this |

## Gaps

1. **File-level, not symbol-level**: Returns file paths with status
   (A/M/D/R) but no symbol-level changes. Card says "not just file names."
2. **No state_load integration**: Caller must provide the saved SHA.

## Drift check

- Uses GitClient port correctly ✅
- Plumbing-safe commands only (diff-tree, rev-list, rev-parse, cat-file) ✅
- No direct node imports ✅
