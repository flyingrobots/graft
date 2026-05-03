---
title: "Verification Witness for Cycle SURFACE_capability-matrix-truth"
---

# Verification Witness for Cycle SURFACE_capability-matrix-truth

This witness proves that `Capability matrix truth for CLI operator
commands` now carries the required behavior and adheres to the repo
invariants.

## Test Results

```text
pnpm exec vitest run --run \
  tests/playback/SURFACE_capability-matrix-truth.test.ts \
  test/unit/contracts/capabilities.test.ts \
  test/unit/release/three-surface-capability-posture.test.ts \
  tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts

Test Files  4 passed (4)
Tests  21 passed (21)
```

```text
pnpm lint

passed
```

```text
pnpm typecheck

passed
```

```text
pnpm release:surface-gate

Test Files  2 passed (2)
Tests  10 passed (10)
```

```text
pnpm test:local

Test Files  199 passed (199)
Tests  1502 passed (1502)
```

```text
pnpm test

> @flyingrobots/graft@0.7.1 test
> tsx scripts/run-isolated-tests.ts

Cannot run isolated test suite because Docker is unavailable.
Docker preflight: Cannot connect to the Docker daemon at
unix://<HOME>/.docker/run/docker.sock. Is the docker daemon running?
`pnpm test` is the release-grade isolated runner and still requires Docker.
Use `pnpm test:local` for non-isolated local feedback while Docker is unavailable.

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 6 playback questions, 285 test descriptions.
Search basis: normalized match, semantic normalization, or
high-confidence token similarity in tests/**/*.test.* and
tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Targeted tests passed.
- [x] `pnpm lint` passed.
- [x] `pnpm typecheck` passed.
- [x] `pnpm release:surface-gate` passed.
- [x] `pnpm test:local` passed.
- [ ] `pnpm test` stopped at Docker availability preflight because the
      Docker daemon is unavailable.
- [x] Drift check passed: `method drift SURFACE_capability-matrix-truth`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
pnpm exec vitest run --run \
  tests/playback/SURFACE_capability-matrix-truth.test.ts \
  test/unit/contracts/capabilities.test.ts \
  test/unit/release/three-surface-capability-posture.test.ts \
  tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts
pnpm lint
pnpm typecheck
pnpm release:surface-gate
pnpm test:local
pnpm test
method drift SURFACE_capability-matrix-truth
```

Expected: `pnpm test` stops at Docker preflight on this machine while the
Docker daemon is unavailable. `pnpm test:local` is the full local suite
used for non-isolated validation under that condition.
Expected: the recorded drift command exits 0.
