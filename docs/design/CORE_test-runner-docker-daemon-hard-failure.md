---
title: "Default test runner hard-fails when Docker is unavailable"
legend: "CORE"
cycle: "CORE_test-runner-docker-daemon-hard-failure"
source_backlog: "docs/method/backlog/bad-code/CORE_test-runner-docker-daemon-hard-failure.md"
---

# Default test runner hard-fails when Docker is unavailable

Source backlog item: `docs/method/backlog/bad-code/CORE_test-runner-docker-daemon-hard-failure.md`
Legend: CORE

## Hill

`pnpm test` checks Docker availability before invoking the isolated
test runner and fails with an operator-readable message when Docker is
unavailable.

The message must preserve the release contract: `pnpm test` remains the
Docker-isolated validation path, while `pnpm test:local` is named only
as the non-isolated local feedback fallback.

## Playback Questions

### Human

- [x] Can I tell immediately that the failure is Docker availability,
      not a Vitest failure?
- [x] Does the failure message name `pnpm test:local` as the
      non-isolated local feedback fallback?
- [x] Does the message preserve that release-grade `pnpm test` still
      requires Docker isolation?

### Agent

- [x] Does `pnpm test` detect unavailable Docker before invoking
      `docker build`?
- [x] Is the Docker preflight formatting deterministic and testable
      without a live Docker daemon?
- [x] Does the release/check path keep using the isolated runner rather
      than silently falling back to host-side Vitest?

## Accessibility and Assistive Reading

- Linear truth / reduced-complexity posture: the first line names
  Docker availability as the problem before any command detail.
- Non-visual or alternate-reading expectations: plain text, no color or
  terminal control sequences.

## Localization and Directionality

- Locale / wording / formatting assumptions: English CLI diagnostics;
  no date, time, or numeric locale formatting.
- Logical direction / layout assumptions: left-to-right CLI text only.

## Agent Inspectability and Explainability

- What must be explicit and deterministic for agents: failure class,
  Docker preflight detail, release-isolated runner requirement, and
  local fallback command.
- What must be attributable, evidenced, or governed: the check must
  happen before the Docker build step so unavailable Docker is not
  reported as an opaque lifecycle/test failure.

## Non-goals

- [x] Do not make `pnpm test` silently run host-side Vitest.
- [x] Do not weaken `pnpm release:check`; release validation still
      requires the isolated Docker runner.
- [x] Do not broaden this into general Docker setup automation.

## Backlog Context

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
