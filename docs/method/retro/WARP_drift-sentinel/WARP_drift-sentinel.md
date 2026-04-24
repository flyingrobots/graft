# Retro: WARP_drift-sentinel

## What shipped

`runDriftSentinel(ctx, options)` scans all tracked markdown files
for stale symbol references by delegating to `checkStaleDocs` per
file. Returns a structured `DriftSentinelReport` with pass/fail
verdict, per-file results, and aggregate stale/unknown counts.

## Acceptance criteria review

| Criterion | Status |
|---|---|
| Detects renamed/removed symbols | ✅ Via checkStaleDocs |
| Flags signature differences | ✅ Via checkStaleDocs |
| Can run as pre-commit hook | ⚠️ Returns pass/fail but no hook script |
| Machine-readable output with file, line, symbol | ⚠️ Has file + symbol but no line numbers |

## Gaps identified during playback

1. **No line numbers**: StaleDocReport includes docPath and
   staleSymbols[].symbol but not the line number where the symbol
   is referenced in the doc. The card says "file, line, symbol."
2. **No pre-commit hook script**: The function returns `passed`
   which a hook could use, but no scripts/hooks/pre-commit
   integration exists.
3. **Dead `pattern` parameter**: DriftSentinelOptions.pattern is
   declared but never read in the implementation.

## Drift check

- Uses WarpContext + GitClient ports (correct)
- Delegates to checkStaleDocs (correct layering)
- Plumbing-safe git commands only (ls-files, log, show)
- No direct node imports, no port bypasses
- Dead parameter `pattern` is a minor smell

## Tests (4)

1. Detects stale symbol after signature change
2. Passes on fresh docs
3. Machine-readable output shape
4. Empty results for repo with no markdown

## What to watch

- Line number gap should be filed as bad-code if the acceptance
  criterion is considered binding.
- The pattern parameter should either be wired or removed.
