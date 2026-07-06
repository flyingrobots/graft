# Retro: CLEAN CI Node 20 smoke

## Status

Met locally; remote CI proving in PR #225 after the cache rollback commit.

## What Shipped

Graft CI now separates proof responsibilities across the existing Node matrix:

- `test (22)` remains the release-grade proof lane and still runs schema drift,
  lint, typecheck, and Docker-isolated `pnpm test`.
- `test (20)` now proves host-side package compatibility under Node 20 with
  typecheck, build, and `node bin/graft.js --version`.
- The isolated test runner remains unchanged after backing out the speculative
  Buildx cache path.

## What Changed

The previous CI matrix ran the same Docker-isolated full suite in both Node
lanes, even though the Dockerfile's test stage uses `node:22-alpine`. The Node
20 lane therefore spent time rebuilding and running a Node 22 container rather
than proving Node 20 runtime behavior.

The new shape keeps branch-protection check names stable while making each lane
honest:

- Node 22 owns the full isolated test proof.
- Node 20 owns package compatibility.

## Cache Attempt

The first PR run with Buildx cache enabled proved too slow on its first pass:
`test (22)` completed in 4m43s. Since the operator problem is feedback latency,
the cache path was removed from the final diff rather than shipped as a
speculative future optimization.

## Non-Goals Held

- Did not replace release-grade Docker isolation with host-only Vitest.
- Did not change `pnpm release:check`.
- Did not change runtime code or package engines.
- Did not shard the full suite by filename.
- Did not ship Docker layer caching without a faster PR-run result.

## Verification

See `witness/verification.md`.

## Follow-Ons

- If PR wall time remains high after the duplicate lane removal, profile the
  Vitest suite itself and file a separate test-sharding or slow-test card with
  per-file timings.
