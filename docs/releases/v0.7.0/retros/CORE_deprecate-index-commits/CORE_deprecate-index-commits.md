---
title: "Remove legacy commit-walking indexer"
cycle: "CORE_deprecate-index-commits"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/CORE_deprecate-index-commits.md"
outcome: hill-met
drift_check: yes
---

# Remove legacy commit-walking indexer Retro

## Summary

Deleted 7 source files (~1600 lines), enhanced indexHead with commit nodes + prior-state reconciliation (adds/changes/removes edges), migrated 8 test files. 1175 tests pass, lint clean. reference-count.ts survived (bad-code filed). Monitor field rename deferred.

## Playback Witness

Artifacts under `docs/releases/v0.7.0/retros/CORE_deprecate-index-commits/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
