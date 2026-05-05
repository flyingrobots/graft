# Next Release Ranked Queue

Status: v0.8.0 backlog lane formed

## Release thesis

`v0.7.0` made the WARP, daemon, git-facing, and governed-edit surfaces
real. `v0.7.1` cleaned the npm distribution shape. The next release
should not immediately widen into another large substrate bet.

The best v0.8.0 spine is Review Truth:

- tell reviewers what changed structurally before they read the whole
  diff
- add bounded provenance hints for changed symbols
- expose symbol history and removed-symbol evidence as small
  WARP-backed review lenses
- surface obvious structural test-reference gaps without claiming
  execution coverage
- make automated review readiness explicit during PR feedback loops
- keep feedback-resolution evidence tied to local commits before any PR
  comment is posted
- keep Graft repo-generic instead of embedding METHOD backlog, retro,
  release, or dependency-DAG conventions
- defer semantic enrichment and daemon actions until the truth surfaces
  are boring and testable

This queue is a scope decision, not a commitment to burn down every
listed idea.

## Above the line

1. [v0.8.0 lane](backlog/v0.8.0/README.md)
   Scope lane for the current candidate shape. This is not release prep
   or a tag promise; it is the pull-order truth for likely v0.8.0 work.

2. [CORE_pr-review-structural-summary.md](backlog/v0.8.0/CORE_pr-review-structural-summary.md)
   Opening implementation spine for the user-visible Review Truth
   workflow.
   It should compose existing structural diff/enhance facts rather than
   inventing a new review engine.

3. [CORE_structural-test-coverage-map.md](backlog/v0.8.0/CORE_structural-test-coverage-map.md)
   Follow-up review helper for structural test-reference signals.

4. [SURFACE_git-graft-enhance-provenance-hints.md](backlog/v0.8.0/SURFACE_git-graft-enhance-provenance-hints.md)
   Bounded provenance hints for changed symbols in review summaries.

5. [WARP_symbol-history-timeline.md](backlog/v0.8.0/WARP_symbol-history-timeline.md)
   Per-symbol structural history for changed code using shipped WARP
   commit-to-symbol edges.

6. [WARP_dead-symbol-detection.md](backlog/v0.8.0/WARP_dead-symbol-detection.md)
   Removed-symbol evidence for cleanup and API-surface shrinkage review.

7. [SURFACE_review-cooldown-status.md](backlog/v0.8.0/SURFACE_review-cooldown-status.md)
   PR-feedback helper for making automated review readiness explicit.

8. [SURFACE_pr-feedback-resolution-ledger.md](backlog/v0.8.0/SURFACE_pr-feedback-resolution-ledger.md)
   Local ledger that maps unresolved feedback to resolutions, commits,
   reply status, and markdown summaries before GitHub mutation.

9. [CORE_tool-context-injection-contracts.md](backlog/v0.8.0/CORE_tool-context-injection-contracts.md)
   Release hardening gate for dependency injection correctness.

10. [TEST_bounded-subprocess-policy.md](backlog/v0.8.0/TEST_bounded-subprocess-policy.md)
   Release hardening gate for bounded subprocess behavior in tests and
   scripts.

## Below the line

- [CORE_backlog-status-tool.md](graveyard/CORE_backlog-status-tool.md)
  was canceled for Graft. METHOD-specific backlog/status surfaces belong
  in Method MCP / Method CLI, not in a repo-generic Graft command.

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

- [SURFACE_git-graft-enhance-expanded-git-subcommands.md](backlog/cool-ideas/SURFACE_git-graft-enhance-expanded-git-subcommands.md)
  and [CI-003-mcp-native-diff-protocol.md](backlog/cool-ideas/CI-003-mcp-native-diff-protocol.md)
  are valid surface work, but they widen v0.8.0 into broad Git wrapping
  or protocol shape. Keep them below the line for this release.

- [WARP_auto-breaking-change-detection.md](backlog/cool-ideas/WARP_auto-breaking-change-detection.md)
  remains review-adjacent, but it depends on the smaller dead-symbol
  primitive and the unresolved export-diff semver classification fix.
  Keep it below the line until those are settled.

## Next pull

Pull `CORE_pr-review-structural-summary` next from the v0.8.0 lane.
Keep the scope repo-generic: a structural review summary built on
existing diff facts, with GitHub Action posting deferred. Do not add
METHOD state or broad merge-readiness semantics.
