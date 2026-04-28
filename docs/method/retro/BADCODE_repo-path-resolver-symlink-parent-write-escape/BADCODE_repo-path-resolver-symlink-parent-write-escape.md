---
title: "Repo path resolver can miss symlink-parent escapes for future writes"
cycle: "BADCODE_repo-path-resolver-symlink-parent-write-escape"
design_doc: "docs/design/BADCODE_repo-path-resolver-symlink-parent-write-escape.md"
outcome: hill-met
drift_check: yes
---

# Repo path resolver can miss symlink-parent escapes for future writes Retro

## Summary

Closed BADCODE_repo-path-resolver-symlink-parent-write-escape after hardening createRepoPathResolver to validate the nearest existing ancestor before allowing a logical in-repo target. The fix rejects non-existent children under symlinked directories that escape the repo, preserves normal non-existent in-root paths, keeps logical and canonical project roots consistent, and preserves existing absolute-outside plus symlink-file and symlink-directory rejection. No governed edit, write tools, broad node:path refactor, WARP/LSP/daemon/provenance work, or production changes beyond the narrow resolver fix were included.

## Playback Witness

Artifacts under `docs/method/retro/BADCODE_repo-path-resolver-symlink-parent-write-escape/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
