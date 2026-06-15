---
title: "Unpinned committed-history bases deserve their own basis kind"
cycle: "CORE_unpinned-basis-kind-for-structural-history"
design_doc: "docs/design/CORE_unpinned-basis-kind-for-structural-history.md"
outcome: hill-met
drift_check: yes
---

# Unpinned committed-history bases deserve their own basis kind Retro

## Summary

Graft structural-history schema v0.2 now distinguishes unpinned committed-history bases with `UNPINNED_COMMITTED`, keeps `GIT_REF` reserved for semantically present refs, regenerates Wesley declarations/codecs and manifest/descriptor hashes, gates the LE-binary codec in schema drift checks, and preserves git-warp public round-trip behavior. PR #94 merged as 0ea87abe after Code Lawyer review repairs and green CI.

## Playback Witness

Artifacts under `docs/method/retro/CORE_unpinned-basis-kind-for-structural-history/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
