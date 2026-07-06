---
title: "CI Node 20 smoke"
legend: CLEAN
cycle: CLEAN_ci-node20-smoke
source_backlog: "operator-reported CI latency"
---

# CI Node 20 smoke

Source: operator report that touching Graft makes test feedback feel too slow.
Legend: CLEAN

## Sponsors

- Human: James Ross
- Agent: Codex

## Hill

Graft keeps the release-grade Docker-isolated proof in CI while removing a
duplicated container run and making the Node 20 matrix lane prove actual
Node 20 package compatibility.

## Evidence

The `main` CI run `28760702996` on `8703e590` ran two matrix lanes:

- `test (22)` ran `pnpm test` for about 3 minutes inside a 3m51s job.
- `test (20)` ran `pnpm test` for about 3m37s inside a 4m36s job.

Both lanes invoked the same Docker-isolated test harness. The Dockerfile's
test stage is based on `node:22-alpine`, so the Node 20 lane was not actually
running the Vitest suite on Node 20. It was running host setup under Node 20
and then rebuilding/running the same Node 22 container proof.

An attempted Buildx cache path on PR #225 made the first Node 22 proof slower:
`test (22)` completed in 4m43s while populating cache. That path was backed out
before claiming the cycle met.

## Acceptance Criteria

- The `test (22)` CI lane still runs the release-grade Docker-isolated
  `pnpm test` suite.
- The `test (20)` CI lane stops running the Docker-isolated suite and instead
  runs host-side package compatibility checks under Node 20.
- The Node 20 lane builds package artifacts and executes the package binary
  under Node 20.
- The isolated test runner's default local behavior is unchanged.
- The GitHub check names remain compatible with existing branch protection:
  `test (20)` and `test (22)`.

## Playback Questions

### Human

- [ ] Can I see that Graft no longer repeats the same Dockerized test proof in
      both matrix lanes?
- [ ] Can I tell that Node 20 is still explicitly checked?
- [ ] Can release sanity still run the isolated test path?

### Agent

- [ ] Does default `pnpm test` still use the release-grade Docker runner?
- [ ] Does Node 20 execute a real build and binary smoke?
- [ ] Does the change avoid making host-only tests the release proof?

## Decision

Keep the `test` matrix so branch-protection check names stay stable, but split
the proof responsibility:

- Node 22 remains the canonical CI lane for schema drift, lint, typecheck, and
  Docker-isolated full tests.
- Node 20 becomes a host compatibility lane: typecheck, build, and package
  binary smoke under Node 20.

Release sanity is unchanged and still runs `pnpm test`.

## Non-goals

- Do not replace release-grade Docker isolation with host-only Vitest.
- Do not change the Docker runtime image or package `engines`.
- Do not shard the test suite by filename in this slice.
- Do not alter `pnpm release:check`.
- Do not change Graft runtime behavior.
- Do not ship speculative Docker layer caching without evidence that it reduces
  the PR wall clock.

## Expected Test Strategy

- Run the focused runner/release test file to prove the isolated runner remains
  unchanged.
- Run Docker-isolated focused tests through `pnpm test`.
- Run lint, typecheck, build, binary smoke, and whitespace checks for the
  changed surface.
