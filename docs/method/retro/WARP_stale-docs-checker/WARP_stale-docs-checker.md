# Retro: WARP_stale-docs-checker

## What shipped

Three functions in `src/warp/stale-docs.ts`:
- `extractDocSymbolReferences(markdown)` — parse symbol names from docs
- `checkStaleDocs(ctx, docPath, docCommitSha, docContent)` — cross-ref against WARP
- `checkVersionDrift(packageVersion, changelogContent)` — version comparison

## Tests (11)

Extraction: backtick, code blocks, dedup, non-identifiers, empty
Staleness: changed-after-doc flagged, unchanged not flagged, unknown symbols
Version: mismatch, match, missing heading

## Adaptation from wrecking crew branch

- `WarpHandle` → `WarpContext` + `observeGraph()` convention
- `observe()`/`commitsLens()` from observers.js → `observeGraph()` from context.js
- Fixed 4 non-null assertion lint errors (regex capture groups)

## Bad code filed

`stale-docs-version-regex-missing-brackets` — the CHANGELOG_VERSION_RE
regex doesn't match bracket format (`## [1.5.0]`) which is what this
repo actually uses. Filed to bad-code lane.

## What to watch

- Symbol extraction is heuristic — backtick-quoted text that happens
  to be a valid identifier but isn't a real symbol will produce false
  positives (e.g., `README` in backticks would be checked against
  the WARP graph). Consider a stoplist for common non-symbol words.
