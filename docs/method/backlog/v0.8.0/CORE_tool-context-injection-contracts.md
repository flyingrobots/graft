---
title: "ToolContext injection contract coverage"
feature: core
kind: debt
legend: CORE
lane: v0.8.0
priority: 4
effort: M
requirements:
  - "Composition root dependency inventory"
  - "Representative tool calls for each injected ToolContext dependency"
acceptance_criteria:
  - "Tests prove injected Git, filesystem, process, codec, and observability dependencies reach ToolContext consumers"
  - "Server construction tests fail if createGraftServer bypasses resolved dependency instances"
  - "Daemon and repo-local modes share the same dependency injection contract assertions where possible"
---

# ToolContext injection contract coverage

The PR review found that `createGraftServer` resolved `gitClient` from
options but still passed `nodeGit` into `buildToolContext`. The local fix
adds a regression around `graft_map`, but the same class of regression
could affect any ToolContext dependency.

## Implementation path

1. Inventory every dependency passed into `buildToolContext`.
2. Pick a representative tool call that exercises each dependency.
3. Use recording test doubles to assert that the resolved dependency,
   not the default adapter, is used by the tool surface.
4. Run the same checks in repo-local mode first, then add daemon-mode
   coverage for dependencies that cross the scheduler boundary.
