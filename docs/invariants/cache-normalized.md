# Cache keys are normalized

**Legend:** CORE

The observation cache uses resolved absolute paths as keys. The
same file accessed via `src/foo.ts`, `./src/foo.ts`, or an
absolute path produces the same cache entry.

## If violated

Duplicate cache entries waste memory. Re-read suppression fails —
the agent reads the same file twice and gets content both times
instead of a cached outline on the second read.

## How to verify

- All cache operations (`record`, `check`, `get`) receive paths
  that have already passed through `ctx.resolvePath()`
- `resolvePath` uses `path.resolve(projectRoot, input)` which
  canonicalizes relative paths
