---
title: "Use ProvenanceIndex for structural-blame last-touch provenance"
cycle: "CORE_rewrite-structural-blame-to-use-warp-worldline-provenance"
release: "v0.7.0"
design_doc: "docs/releases/v0.7.0/design/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.md"
outcome: hill-met
drift_check: yes
---

# Use ProvenanceIndex for structural-blame last-touch provenance Retro

## Summary

Hill met. structural-blame now keeps provenance patch membership as the touch source and hydrates symbol version properties by seeking a WARP worldline pinned to each touching patch tick. The MCP structural-blame path remains WARP-only and makes no GitClient calls. CORE_git-graft-enhance was unblocked by removing its stale dependency on this completed cycle and regenerating the backlog DAG. Validation used scrubbed Git environment variables and did not run playback or tests against the live checkout as subject data. Validation: focused structural history set passed (7 files, 52 tests), METHOD drift passed, git diff --check passed, pnpm lint passed, pnpm typecheck passed, env -u GIT_DIR -u GIT_WORK_TREE -u GIT_WARP_HOME pnpm test passed (179 files, 1371 tests).

## Playback Witness

Artifacts under `docs/releases/v0.7.0/retros/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
