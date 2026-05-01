# Next Release Ranked Queue

Status: v0.8.0 scope forming

## Release thesis

`v0.7.0` made the WARP, daemon, git-facing, and governed-edit surfaces
real. `v0.7.1` cleaned the npm distribution shape. The next release
should not immediately widen into another large substrate bet.

The best v0.8.0 spine is operational truth:

- make backlog and METHOD state queryable by Graft itself
- make health diagnostics more coherent before adding more surfaces
- reuse existing structural review facts in release and PR workflows
- defer semantic enrichment and daemon actions until the truth surfaces
  are boring and testable

This queue is a scope decision, not a commitment to burn down every
listed idea.

## Above the line

1. [CORE_backlog-status-tool.md](backlog/asap/CORE_backlog-status-tool.md)
   Build a deterministic backlog/METHOD status model and CLI surface so
   agents stop rebuilding ad hoc scripts to answer "what is active,
   blocked, completed, deferred, or stale?" This is the first proposed
   v0.8.0 cycle.

2. [CORE_graft-doctor.md](backlog/cool-ideas/CORE_graft-doctor.md)
   Recheck scope after backlog status. `graft doctor` already exists as
   a diagnostic surface, including `--sludge`; the remaining useful work
   is likely a narrow unified health report over shipped checks, not a
   from-scratch command.

3. [CORE_pr-review-structural-summary.md](backlog/cool-ideas/CORE_pr-review-structural-summary.md)
   Optional third slice if v0.8.0 wants a user-visible review workflow.
   It should compose existing structural diff/enhance facts rather than
   inventing a new review engine.

## Below the line

- [WARP_lsp-enrichment.md](backlog/cool-ideas/WARP_lsp-enrichment.md)
  remains valid product direction, but it adds a semantic provider
  boundary and new WARP fact class. Pull it only if v0.8.0 explicitly
  becomes a semantic-enrichment release.

- [CORE_migrate-to-slice-first-reads.md](backlog/cool-ideas/CORE_migrate-to-slice-first-reads.md)
  remains externally blocked on git-warp observer geometry APIs. Do not
  pull it until those APIs exist.

- [SURFACE_bijou-daemon-status-live-refresh.md](backlog/cool-ideas/SURFACE_bijou-daemon-status-live-refresh.md)
  and [SURFACE_bijou-daemon-control-plane-actions.md](backlog/cool-ideas/SURFACE_bijou-daemon-control-plane-actions.md)
  are coherent daemon-operator follow-ons, but they should not displace
  the initial v0.8.0 truth-surface spine.

- [CI-002-deterministic-scenario-replay.md](backlog/cool-ideas/CI-002-deterministic-scenario-replay.md)
  is high leverage but large. Keep it for a later scoped pass unless a
  concrete regression demands replay infrastructure immediately.

## Next pull

Pull `CORE_backlog-status-tool` next, starting with RED tests over the
model boundary. Do not start with terminal rendering or broad METHOD
automation. The first slice should read checked-in files, classify
status deterministically, and render a compact table/JSON result.
