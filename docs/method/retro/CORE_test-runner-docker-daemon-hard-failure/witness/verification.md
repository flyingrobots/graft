---
title: "Verification Witness for Cycle CORE_test-runner-docker-daemon-hard-failure"
---

# Verification Witness for Cycle CORE_test-runner-docker-daemon-hard-failure

This witness proves that `Default test runner hard-fails when Docker is
unavailable` now carries the required behavior and adheres to the repo
invariants.

## Isolated Test Runner Preflight

```text

> @flyingrobots/graft@0.7.1 test
> tsx scripts/run-isolated-tests.ts

Cannot run isolated test suite because Docker is unavailable.
Docker preflight: Cannot connect to the Docker daemon at
unix://<HOME>/.docker/run/docker.sock. Is the docker daemon running?
`pnpm test` is the release-grade isolated runner and still requires Docker.
Use `pnpm test:local` for non-isolated local feedback while Docker is
unavailable.

```

This is the expected result on this machine while the Docker daemon is
unavailable: `pnpm test` fails before `docker build` and prints the
release-isolation requirement plus the local fallback.

## Host-Side Fallback Test Results

```text
> @flyingrobots/graft@0.7.1 test:local
> vitest run

Test Files  198 passed (198)
     Tests  1493 passed (1493)
  Duration  58.76s
```

## Targeted Results

```sh
pnpm test:local --run \
  test/unit/method/backlog-dependency-dag.test.ts \
  tests/playback/CORE_test-runner-docker-daemon-hard-failure.test.ts \
  test/unit/release/docker-test-isolation.test.ts
```

```text

Test Files  3 passed (3)
     Tests  16 passed (16)
```

## Pre-Close Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 6 playback questions, 275 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence
token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Static Validation

```text
pnpm lint       # passed
pnpm typecheck  # passed
```

## Automated Capture

- [x] Isolated preflight verified: `pnpm test` fails before `docker build`
      with the Docker-unavailable diagnostic on this machine.
- [x] Full local fallback passed: `pnpm test:local`.
- [x] Static validation passed: `pnpm lint`, `pnpm typecheck`.
- [x] Pre-close drift check passed:
      `method drift CORE_test-runner-docker-daemon-hard-failure`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
pnpm test:local
pnpm lint
pnpm typecheck
```

Expected when Docker is unavailable: `npm test` prints the preflight
diagnostic above and exits before `docker build`; the remaining commands
exit 0.

The drift result above was captured before `method_close`. After close,
the cycle is no longer active and `method drift
CORE_test-runner-docker-daemon-hard-failure` is not a reproducible
post-close command.
