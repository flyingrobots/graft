---
title: "Release workflow main-tag guidance"
cycle: "release-workflow-main-tag-guidance"
outcome: hill-met
drift_check: manual
---

# Release Workflow Main-Tag Guidance Retro

## Summary

Documented the release-operator correction from the v0.11.0 publication cycle.
Graft release guidance now requires agents to inspect the tag-triggered GitHub
Actions release workflow, active jobs, failed-job logs, GitHub Release assets,
and npm registry state directly before claiming release success.

The guidance also makes release authority explicit: release-prep work merges to
`main`, the version tag is created on that `main` commit, and GitHub Actions
deploys from the pushed tag. Release branches, pull request heads, local-only
commits, and untagged commits are not release authorities.

## Playback Witness

Artifacts under
`docs/method/retro/release-workflow-main-tag-guidance/witness`.

## What surprised you?

The release flow was already tag-triggered in Actions and already checked
`package.json` against the tag. The missing piece was not automation; it was
agent-facing guidance sharp enough to prevent operators from treating the
release-prep branch or a coarse wait loop as release truth.

## What would you do differently?

Read `.github/workflows/release.yml` before narrating release progress, then
query the specific run, jobs, logs, and npm registry state.

## Follow-up items

- None.
