---
title: "Automatic workspace admission and isolated WARP sidecars"
cycle: "WARP_automatic-isolated-workspace-sidecars"
design_doc: "docs/design/WARP_automatic-isolated-workspace-sidecars.md"
outcome: hill-met
drift_check: yes
---

# Automatic workspace admission and isolated WARP sidecars Retro

## Summary

This cycle removed both pieces of setup friction without weakening workspace
identity or allowing graph writers into source Git storage.

What shipped:

- a first routed daemon repo-tool call with explicit `cwd` resolves and opens
  its canonical containing worktree with the default capability profile
- automatic opening records exact daemon authorization and session-opened
  state without changing the active workspace binding
- replacement repositories at the same path receive fresh identity and cannot
  inherit elevated capabilities
- all production WARP composition roots use private bare sidecars keyed by
  canonical repository, worktree, and actor/session identity
- daemon workers receive the already-resolved sidecar path; monitors, API,
  repo-local MCP, and CLI use their own logical actor lanes
- sidecars carry deterministic repository-local Git identity and never depend
  on host-global Git configuration
- all supported Vitest package paths run through a copy-in Docker image whose
  post-copy build step removes Git remotes and linked-worktree pointers
- test containers run with no network, no mounts, no Linux capabilities, and
  `no-new-privileges`

Existing source-repository `refs/warp/*` remain untouched by design. This
cycle neither migrates nor deletes legacy graph state.

## Playback Witness

Verification witness: [verification.md](witness/verification.md)

## Drift

- The operator halted host test execution during the cycle and required a
  stronger copy-in-only Docker boundary. The cycle expanded to close every
  supported host-side Vitest escape, including watch, release-gate, and
  environment-variable bypasses.
- The first full hermetic suite exposed eight tests that seeded one graph actor
  and queried another after actor isolation became real. Those fixtures now
  seed the exact MCP session sidecar or exercise the real stable CLI lane.
- The same full suite exposed three maintained contracts: the path-boundary
  allowlist, Docker-routed release command, and generated backlog DAG. All were
  updated before cycle closure.
- An intermediate Think capture hit a host dynamic-library mismatch. The final
  full-GREEN capture succeeded as
  `entry:1788037370369-30cac2a6-76c0-4874-b773-04e6b8b84512`.

## New Debt

- [WARP sidecars have no retention or pruning policy](../../backlog/bad-code/WARP_sidecar-retention-and-pruning.md)
  records the lifecycle risk from persistent per-session graph stores.

## Cool Ideas

- None recorded.

## Backlog Maintenance

- [ ] Inbox processed; outside this operator-directed cycle
- [ ] Global priorities reviewed; outside this operator-directed cycle
- [ ] Dead work buried or merged; outside this operator-directed cycle
