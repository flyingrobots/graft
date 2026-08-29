---
title: "WARP sidecars have no retention or pruning policy"
feature: warp
kind: bad-code
legend: WARP
lane: bad-code
priority: 2
effort: M
status: open
reported: 2026-08-29
---

# WARP sidecars have no retention or pruning policy

## Problem

Graft intentionally creates a distinct persistent bare WARP repository for
each repository, worktree, and logical actor identity under
`~/.graft/graphs`. Daemon MCP actor identities are session-scoped, so normal
agent churn can leave sidecars that will never be selected again.

The isolation boundary is correct, but there is currently no supported way to
list storage age and size, determine whether an actor or worktree is still
live, prune an orphan safely, or configure retention. Storage therefore grows
without an explicit lifecycle.

## Risk

- Long-lived daemon users can accumulate an unbounded number of bare Git
  repositories and objects.
- Manual deletion is error-prone because readable slugs are not authority and
  the identity suffixes are intentionally opaque.
- A naive time-based cleanup could delete a monitor's stable graph or race an
  active writer.

## Desired Outcome

Graft exposes an inspectable, conservative sidecar lifecycle. Operators can
see exact repository/worktree/actor identity, byte size, last successful use,
and liveness before choosing or configuring cleanup. Pruning is serialized
against opens and writes, refuses live stores, and fails closed on malformed or
unsafe paths.

## Acceptance Criteria

- A read-only inventory reports each managed sidecar's canonical identity,
  actor kind, size, last-use evidence, and current liveness.
- Retention is configurable by actor kind so ephemeral MCP sessions and stable
  monitors need not share one policy.
- Automatic and explicit pruning never follow symlinks, leave the configured
  graph root, or delete a sidecar with an active in-process handle or writer.
- Cleanup is race-safe with concurrent sidecar initialization and graph
  writes.
- Dry-run output and completed cleanup produce machine-readable receipts.
- Behavior tests use disposable graph roots inside the copy-in Docker test
  container; no cleanup test can address host graph storage.

## Non-goals

- Do not merge graph state between actor sidecars as part of retention.
- Do not infer code authorship or handoff from sidecar age.
- Do not delete legacy `refs/warp/*` from source repositories.
