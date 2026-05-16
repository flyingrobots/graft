---
title: "Wesley CLI is not hermetic in Graft CI"
feature: core
kind: bad-code
legend: CLEAN
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-05-16
---

# Wesley CLI is not hermetic in Graft CI

## Problem

Graft now carries `schemas/graft-structural-history.graphql` and a
Wesley-generated TypeScript artifact, but Graft does not yet have a hermetic
Wesley CLI dependency in its Node/Docker CI environment.

The current drift check verifies:

- the committed schema source hash
- the committed generated TypeScript hash
- the recorded Wesley L1 registry hash
- required generated structural types
- required generated query operation constants
- required evidence labels

That catches stale edits to either committed file, but it does not regenerate
the TypeScript artifact from the GraphQL schema during CI.

## Risk

A future change could update the manifest and generated artifact manually
without actually running the Wesley compiler. That would preserve local tests
while weakening the "GraphQL is the single source of truth" promise.

## Desired Outcome

Make Wesley generation hermetic for Graft validation without changing Echo or
Wesley semantics.

Acceptable paths include:

- install and cache `wesley-cli` in CI and the Docker test image
- consume a published binary or package wrapper once one exists
- add a Graft-local validation adapter that invokes an explicit `WESLEY_BIN`
  only when configured, while CI config supplies that binary

## Acceptance Criteria

- Graft CI can run a regenerate-and-diff check for
  `schemas/graft-structural-history.graphql`.
- The check fails if `src/generated/graft-structural-history.ts` is not exactly
  what the configured Wesley CLI emits.
- The check records the Wesley CLI version used for generation.
- The check does not require modifying Echo.
- The check does not require modifying Wesley compiler semantics.
