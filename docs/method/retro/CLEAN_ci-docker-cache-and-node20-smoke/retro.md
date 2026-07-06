# Retro: CLEAN CI Docker cache and Node 20 smoke

## Status

Met locally.

## What Shipped

Graft CI now separates proof responsibilities across the existing Node matrix:

- `test (22)` remains the release-grade proof lane and still runs schema drift,
  lint, typecheck, and Docker-isolated `pnpm test`.
- `test (20)` now proves host-side package compatibility under Node 20 with
  typecheck, build, and `node bin/graft.js --version`.
- CI and release sanity initialize Docker Buildx and pass explicit cache import
  and export hints to the isolated test runner.
- The isolated test runner keeps default local behavior unchanged. Buildx is
  selected only when cache environment variables are present.

## What Changed

The previous CI matrix ran the same Docker-isolated full suite in both Node
lanes, even though the Dockerfile's test stage uses `node:22-alpine`. The Node
20 lane therefore spent time rebuilding and running a Node 22 container rather
than proving Node 20 runtime behavior.

The new shape keeps branch-protection check names stable while making each lane
honest:

- Node 22 owns the full isolated test proof.
- Node 20 owns package compatibility.
- Buildx cache reduces repeated image rebuild cost for CI and release sanity.

## Non-Goals Held

- Did not replace release-grade Docker isolation with host-only Vitest.
- Did not change `pnpm release:check`.
- Did not change runtime code or package engines.
- Did not shard the full suite by filename.

## Verification

See `witness/verification.md`.

## Follow-Ons

- If PR wall time remains high after the cache warms, profile the Vitest suite
  itself and file a separate test-sharding or slow-test card with per-file
  timings.
