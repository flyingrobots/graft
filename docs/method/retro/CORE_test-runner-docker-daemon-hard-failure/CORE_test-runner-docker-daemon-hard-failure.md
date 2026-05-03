---
title: "Default test runner hard-fails when Docker is unavailable"
cycle: "CORE_test-runner-docker-daemon-hard-failure"
design_doc: "docs/design/CORE_test-runner-docker-daemon-hard-failure.md"
outcome: hill-met
drift_check: yes
---

# Default test runner hard-fails when Docker is unavailable Retro

## Summary

Added a Docker availability preflight to the isolated pnpm test runner.
When Docker is unavailable, `pnpm test` now fails before `docker build`
with a deterministic diagnostic that names Docker availability, preserves
the release-grade Docker isolation requirement, and points local
operators to `pnpm test:local` for non-isolated feedback.

Added playback and release coverage, regenerated the backlog DAG after
pulling the bad-code card, and verified with lint, typecheck, pre-close
drift, targeted tests, `pnpm test` preflight behavior, and the full
host-side Vitest suite.

## Playback Witness

Artifacts under `docs/method/retro/CORE_test-runner-docker-daemon-hard-failure/witness`.

## What surprised you?

Nothing unexpected.

## What would you do differently?

No changes to approach.

## Follow-up items

- None.
