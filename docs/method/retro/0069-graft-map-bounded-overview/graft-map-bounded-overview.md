---
title: "Bounded graft_map overview mode"
cycle: "0069-graft-map-bounded-overview"
design_doc: "docs/design/0069-graft-map-bounded-overview/graft-map-bounded-overview.md"
outcome: hill-met
drift_check: yes
---

# Bounded graft_map overview mode Retro

## Summary

Shipped bounded overview controls for `graft_map`. The tool now accepts
explicit `depth` and `summary` request knobs, returns `mode` metadata,
reports per-file `symbolCount`, and summarizes clipped descendant
directories instead of forcing the caller into an oversized blob-file
fallback for medium trees.

## Playback Witness

- [verification.md](witness/verification.md)

## Drift

- None recorded.

## New Debt

- [CLEAN_method-drift-test-discovery-misses-repo-playback-tests.md](../../../backlog/bad-code/CLEAN_method-drift-test-discovery-misses-repo-playback-tests.md)

## Cool Ideas

- None recorded.

## Backlog Maintenance

- Captured METHOD drift test-discovery mismatch as `bad-code`
- Closed active cycle `0069-graft-map-bounded-overview`
