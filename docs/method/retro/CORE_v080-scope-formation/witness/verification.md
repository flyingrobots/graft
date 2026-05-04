---
title: "Verification Witness for Cycle CORE_v080-scope-formation"
---

# Verification Witness for Cycle CORE_v080-scope-formation

This witness proves that `v0.8.0 scope formation` now carries the required
behavior and adheres to the repo invariants.

## Test Results

Focused playback:

```text
pnpm vitest run \
  tests/playback/CORE_v080-scope-formation.test.ts \
  test/unit/method/backlog-dependency-dag.test.ts

Test Files  2 passed (2)
Tests       8 passed (8)
```

Static validation:

```text
pnpm lint
pnpm typecheck
```

Both commands exited 0.

Full non-isolated local suite:

```text
pnpm test:local

Test Files  201 passed (201)
Tests       1520 passed (1520)
```

Release-grade Docker-isolated preflight:

```text
pnpm test

Cannot run isolated test suite because Docker is unavailable.
Docker preflight: Cannot connect to the Docker daemon at
unix://<HOME>/.docker/run/docker.sock. Is the docker daemon running?
`pnpm test` is the release-grade isolated runner and still requires Docker.
Use `pnpm test:local` for non-isolated local feedback while Docker is unavailable.

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 291 test descriptions.
Search basis: normalized match, semantic normalization, or
high-confidence token similarity in tests/**/*.test.* and
tests/**/*.spec.* descriptions.

```

This drift output was captured before `method_close` moved the cycle out
of the active design set.

## Automated Capture

- [x] Targeted playback passed.
- [x] Backlog DAG witness passed after promoting the selected next card
      to `asap/` and regenerating active backlog artifacts.
- [x] Lint passed.
- [x] Typecheck passed.
- [x] Full local suite passed.
- [ ] Docker-isolated `pnpm test` could not run because Docker is
      unavailable in this environment.
- [x] Drift check passed before close:
      `method drift CORE_v080-scope-formation`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
pnpm vitest run \
  tests/playback/CORE_v080-scope-formation.test.ts \
  test/unit/method/backlog-dependency-dag.test.ts
pnpm lint
pnpm typecheck
pnpm test:local
pnpm test
```

Expected: focused playback, lint, typecheck, and `pnpm test:local` exit 0.
Expected: `pnpm test` exits at Docker preflight when Docker is unavailable.
Expected: the recorded drift output remains historical evidence from
before `method_close`; closed cycles are no longer active drift targets.
