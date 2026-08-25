---
title: "git-warp v19 public API cannot preserve the Graft graph port"
feature: git-warp-upgrade
kind: bad-code
legend: WARP
lane: bad-code
priority: 1
effort: L
status: open
reported: 2026-08-25
---

# git-warp v19 public API cannot preserve the Graft graph port

## Problem

Graft's `WarpGraphPort` is now the sole production boundary around git-warp,
but the published v19.1.0 application API cannot implement that port without
weakening observable behavior.

One Graft patch callback currently publishes one durable patch containing any
combination of nodes, removals, edges, properties, and content attachments. A
callback failure publishes none of those operations. The adapter contract test
also proves one reopened receipt, content bytes and metadata, and restart
visibility.

The public v19 surface differs in several consequential ways:

- `Lane.write()` accepts exactly one Intent.
- `entity.add` combines one new node with initial properties, but cannot add an
  edge, remove an entity, or attach content in the same Intent.
- Public strand settlement promotes staged intents to the parent one at a
  time and retains partial-commit recovery evidence if a later promotion
  fails. It is not an atomic composite write.
- No public Intent or Observer attaches or retrieves git-warp content bytes
  and metadata.
- Public node/property readings are exact and graph charts expose bounded
  one-hop neighborhoods; they do not implement Graft's wildcard lens
  enumeration, arbitrary traversal/query surface, or entity-to-patch history.

Private `dist/` modules still contain transitional graph machinery, but using
them would violate the requested public-API cutover and the package export
contract.

## Risk

Mapping one Graft patch to independent writes can expose a partial prefix after
failure. Encoding content inline without a size and retention design can
inflate every reading and abandon existing content-addressed payloads. A
whole-graph snapshot or application event log could recover some operations,
but discovery, concurrency, history, retained-data migration, and restart
semantics would become a new Graft persistence model rather than a mechanical
adapter change.

## Desired Outcome

Choose and prove one honest boundary:

1. git-warp publishes public composite Intent, content, bounded enumeration,
   and provenance capabilities sufficient for the existing port; or
2. Graft designs a new application-owned representation with one atomic
   publication point, bounded indexes, content retention, deterministic
   concurrent discovery, historical coordinates, and an executable v18 data
   migration.

The second option requires its own design packet and must not be hidden inside
a dependency bump.

## Acceptance Criteria

- One representative Graft transaction containing nodes, properties, an edge,
  and content has one atomic public v19 publication and one receipt.
- An injected failure at every internal stage leaves no visible transaction
  prefix after restart.
- Existing retained content and new content round-trip as bytes plus metadata
  without unbounded whole-graph property snapshots.
- Exact, wildcard, traversal, query, historical ceiling, and provenance cases
  used by Graft have bounded executable witnesses.
- Concurrent writers cannot lose discovery/index updates or allocate the same
  application event identity.
- The v18-to-v19 application-data migration preserves visible state, history,
  and content on a disposable copy of the real graph.
- Production imports use only the package root and documented public expert
  subpaths.
- The existing `WarpGraphPort` contract is not weakened merely to make the
  dependency declaration compile.
