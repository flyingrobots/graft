---
title: "Wesley CLI is not hermetic in Graft CI"
feature: core
kind: bad-code
legend: CLEAN
lane: graveyard
priority: 2
effort: M
status: closed
reported: 2026-05-16
closed: 2026-05-31
---

# Wesley CLI is not hermetic in Graft CI

## Disposition

Graft's structural-history schema check now has a hermetic Wesley path:
`pnpm schema:structural-history:check` requires `WESLEY_BIN`, verifies the
configured CLI version, verifies the Wesley L1 registry hash, regenerates the
TypeScript artifact into a temporary path, and byte-compares that output with
`src/generated/graft-structural-history.ts`.

CI installs Wesley from the pinned `flyingrobots/wesley` `v0.0.4` release commit
and runs the regenerate-and-diff check before lint, typecheck, and tests.

## Original Problem

Graft carries `schemas/graft-structural-history.graphql` and a
Wesley-generated TypeScript artifact, but did not yet have a hermetic Wesley CLI
dependency in its Node/Docker CI environment.

The previous drift check verified:

- the committed schema source hash
- the committed generated TypeScript hash
- the recorded Wesley L1 registry hash
- required generated structural types
- required generated query operation constants
- required evidence labels

That caught stale edits to either committed file, but it did not regenerate the
TypeScript artifact from the GraphQL schema during CI.

## Original Risk

A future change could update the manifest and generated artifact manually
without actually running the Wesley compiler. That would preserve local tests
while weakening the "GraphQL is the single source of truth" promise.

## Original Acceptance Criteria

- Graft CI can run a regenerate-and-diff check for
  `schemas/graft-structural-history.graphql`.
- The check fails if `src/generated/graft-structural-history.ts` is not exactly
  what the configured Wesley CLI emits.
- The check records the Wesley CLI version used for generation.
- The check does not require modifying Echo.
- The check does not require modifying Wesley compiler semantics.
