---
title: "Default test runner hard-fails when Docker is unavailable"
feature: core
kind: leaf
legend: CORE
lane: bad-code
effort: S
requirements:
  - "pnpm test isolated Docker runner"
  - "pnpm test:local Vitest runner"
acceptance_criteria:
  - "`pnpm test` detects an unavailable Docker daemon before invoking the isolated runner"
  - "The failure message names `pnpm test:local` as the non-isolated fallback for local feedback"
  - "The release/check path still requires the isolated Docker runner unless explicitly overridden"
---

# Default test runner hard-fails when Docker is unavailable

During PR #41 feedback processing, `pnpm test` could not start because
the Docker daemon socket was unavailable:

```text
ERROR: Cannot connect to the Docker daemon at unix:///Users/james/.docker/run/docker.sock.
```

That is valid for release-grade isolation, but the current failure gives
no repo-native next step. The local fallback, `pnpm test:local`, passed
the full Vitest suite in the same session.

## Why this matters

Agents and humans following the end-of-turn checklist need to distinguish
"tests failed" from "the isolated runner is unavailable." Today those are
both surfaced as a generic lifecycle failure from `pnpm test`.

## Suggested fix

Add a Docker availability preflight to `scripts/run-isolated-tests.ts`.
If Docker is unavailable, exit with a message that explains the release
requirement and points local operators to `pnpm test:local` for
non-isolated feedback.
