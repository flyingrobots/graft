---
title: "Verification Witness for Cycle SURFACE_opened-workspace-paths"
---

# Verification Witness for Cycle SURFACE_opened-workspace-paths

This witness proves that `Opened workspace paths` now carries the required
behavior and adheres to the repo invariants.

## Test Results

```text

> @flyingrobots/graft@0.8.0 test
> tsx scripts/run-isolated-tests.ts


 RUN  v4.1.2 /app

 ✓ test/unit/parser/outline.test.ts (26 tests) 90ms
 ✓ test/unit/mcp/persisted-local-history.test.ts (13 tests) 767ms
     ✓ retains full read-event history in the WARP graph  706ms
 ✓ test/unit/mcp/runtime-observability.test.ts (14 tests) 2205ms
 ✓ test/unit/cli/init.test.ts (29 tests) 132ms
 ✓ test/unit/mcp/tools.test.ts (33 tests) 3227ms
 ✓ test/unit/cli/main.test.ts (20 tests) 1440ms
     ✓ runs symbol difficulty through the grouped CLI surface  414ms
 ✓ test/unit/mcp/precision.test.ts (18 tests) 2200ms
 ✓ test/unit/mcp/layered-worldline.test.ts (14 tests) 1884ms
       ✓ labels historical symbol reads as commit_worldline  468ms
 ✓ test/unit/warp/lsp-semantic-enrichment.test.ts (13 tests) 1104ms
 ✓ test/integration/mcp/daemon-server.test.ts (4 tests) 2660ms
     ✓ preserves safe_read cache behavior across off-process daemon execution  698ms
     ✓ offloads dirty precision lookups through child-process workers  638ms
     ✓ persists repo-scoped monitor lifecycle across daemon restart  1237ms
 ✓ test/unit/operations/export-surface-diff.test.ts (13 tests) 784ms
 ✓ test/unit/mcp/persisted-local-history-graph.test.ts (6 tests) 50ms
 ✓ test/unit/operations/structural-review.test.ts (11 tests) 830ms
 ✓ test/unit/parser/outline-audit.test.ts (42 tests) 10ms
 ✓ tests/playback/0058-system-wide-resource-pressure-and-fairness.test.ts (8 tests) 973ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  612ms
 ✓ test/unit/contracts/output-schemas.test.ts (8 tests) 8908ms
     ✓ validates representative MCP tool outputs against the declared schemas  1718ms
     ✓ validates representative CLI peer outputs against the declared schemas  7004ms
 ✓ tests/playback/SURFACE_agent-dx-governed-edit.test.ts (12 tests) 697ms
     ✓ Does it refuse outside-repo, ignored, generated, lockfile, binary, minified, build-output, and likely-secret paths?  306ms
 ✓ test/unit/contracts/causal-ontology.test.ts (6 tests) 31ms
 ✓ test/unit/operations/structural-test-coverage-map.test.ts (5 tests) 205ms
 ✓ test/unit/library/structured-buffer.test.ts (7 tests) 66ms
 ✓ tests/playback/CORE_v060-bad-code-burndown.test.ts (13 tests) 61ms
 ✓ test/unit/mcp/daemon-worker-pool.test.ts (7 tests) 3117ms
     ✓ runs monitor tick work on a child-process worker and reports worker counts  688ms
     ✓ runs an offloaded repo tool on a child-process worker  627ms
     ✓ Does the daemon keep session state authoritative in-process while workers execute against immutable snapshots and return deltas?  605ms
     ✓ refuses absolute paths outside the repo in the offloaded read worker context  572ms
     ✓ runs dirty code_find through the live worker path  600ms
 ✓ test/unit/mcp/workspace-binding.test.ts (11 tests) 1082ms
     ✓ rebinds across worktrees of the same repo without carrying session-local state  396ms
 ✓ test/unit/parser/diff.test.ts (18 tests) 58ms
 ✓ test/unit/mcp/graft-edit.test.ts (11 tests) 451ms
 ✓ test/unit/operations/graft-diff.test.ts (12 tests) 695ms
 ✓ test/unit/mcp/receipt.test.ts (19 tests) 2372ms
 ✓ test/unit/warp/ast-import-resolver.test.ts (10 tests) 989ms
 ✓ tests/playback/0088-target-repo-git-hook-bootstrap.test.ts (6 tests) 485ms
 ✓ test/unit/mcp/changed.test.ts (14 tests) 2214ms
 ✓ test/unit/mcp/tool-call-footprint.test.ts (17 tests) 32ms
 ✓ tests/playback/CORE_migrate-path-ops-to-port.test.ts (7 tests) 838ms
     ✓ In temp repos only, does `safe_read` refuse or fail clearly for an absolute path outside the repo root on every runtime surface?  776ms
 ✓ test/unit/policy/cross-surface-parity.test.ts (6 tests) 1181ms
     ✓ keeps governed-read behavior honest across hooks and safe_read  378ms
 ✓ tests/playback/SURFACE_governed-write-tools.test.ts (9 tests) 208ms
 ✓ tests/playback/SURFACE_opened-workspace-paths.test.ts (7 tests) 1339ms
     ✓ Can a repo-local MCP server open a second git worktree and run `safe_read`, `graft_map`, and `code_find` against it without process restart?  443ms
 ✓ test/unit/warp/symbol-timeline.test.ts (7 tests) 1011ms
 ✓ test/unit/mcp/structural-policy.test.ts (8 tests) 965ms
 ✓ test/unit/parser/value-objects.test.ts (33 tests) 32ms
 ✓ test/unit/mcp/daemon-multi-session.test.ts (3 tests) 1328ms
     ✓ shares daemon-wide workspace authorization and bound session state across sessions on the same repo  668ms
     ✓ surfaces shared-worktree posture and explicit handoff for two daemon sessions on one worktree  395ms
 ✓ test/unit/mcp/code-refs.test.ts (6 tests) 450ms
 ✓ test/unit/mcp/runtime-workspace-overlay.test.ts (5 tests) 134ms
 ✓ test/unit/mcp/graft-edit-drift-warning.test.ts (8 tests) 538ms
 ✓ test/unit/operations/structural-blame.test.ts (5 tests) 944ms
     ✓ detects last signature change across commits  323ms
 ✓ test/unit/mcp/cache.test.ts (15 tests) 2406ms
 ✓ test/unit/operations/diff-identity.test.ts (8 tests) 27ms
 ✓ test/unit/git/diff.test.ts (17 tests) 396ms
 ✓ tests/playback/0061-provenance-attribution-instrumentation.test.ts (15 tests) 29ms
 ✓ test/unit/operations/safe-read.test.ts (16 tests) 79ms
 ✓ test/integration/mcp/server.test.ts (9 tests) 1480ms
 ✓ test/unit/guards/stream-boundary.test.ts (28 tests) 31ms
 ✓ test/unit/adapters/repo-paths-invariants.test.ts (25 tests) 41ms
 ✓ test/unit/warp/structural-queries.test.ts (5 tests) 985ms
       ✓ returns removed symbols when a function is deleted  319ms
 ✓ test/unit/mcp/daemon-job-scheduler.test.ts (4 tests) 40ms
 ✓ test/unit/cli/daemon-status-model.test.ts (2 tests) 33ms
 ✓ test/unit/warp/stale-docs.test.ts (13 tests) 728ms
 ✓ test/unit/mcp/repo-concurrency.test.ts (6 tests) 26ms
 ✓ tests/playback/CORE_v080-scope-formation.test.ts (6 tests) 28ms
 ✓ test/unit/cli/git-graft-enhance-model.test.ts (4 tests) 38ms
 ✓ test/unit/metrics/metrics.test.ts (14 tests) 28ms
 ✓ tests/playback/CORE_test-runner-docker-daemon-hard-failure.test.ts (9 tests) 28ms
 ✓ test/unit/mcp/opened-workspaces.test.ts (5 tests) 724ms
 ✓ test/unit/warp/structural-reading-adapter.test.ts (4 tests) 30ms
 ✓ tests/playback/0081-composition-roots-for-cli-mcp-daemon-and-hooks.test.ts (5 tests) 28ms
 ✓ test/unit/mcp/map-truncation.test.ts (5 tests) 956ms
 ✓ test/unit/warp/since.test.ts (3 tests) 864ms
     ✓ detects removed symbols between two commits  340ms
 ✓ test/unit/warp/drift-sentinel.test.ts (5 tests) 970ms
 ✓ test/unit/hooks/pretooluse-read.test.ts (13 tests) 37ms
 ✓ test/unit/warp/index-head.test.ts (5 tests) 751ms
 ✓ test/unit/mcp/persistent-monitor.test.ts (2 tests) 583ms
     ✓ Do background monitors run through the same pressure and fairness scheduler as foreground repo work?  377ms
 ✓ tests/playback/0063-richer-semantic-transitions.test.ts (11 tests) 29ms
 ✓ tests/playback/0059-graph-ontology-and-causal-collapse-model.test.ts (10 tests) 27ms
 ✓ tests/playback/0075-hexagonal-architecture-convergence-plan.test.ts (8 tests) 28ms
 ✓ tests/playback/0076-hex-layer-map-and-dependency-guardrails.test.ts (9 tests) 2910ms
     ✓ Do contracts and pure helpers reject imports from ports, application modules, secondary adapters, primary adapters, and host libraries?  2499ms
 ✓ test/unit/warp/warp-structural-churn.test.ts (6 tests) 824ms
 ✓ tests/playback/SURFACE_bijou-daemon-status-first-slice.test.ts (5 tests) 36ms
 ✓ tests/playback/0074-local-causal-history-graph-schema.test.ts (9 tests) 29ms
 ✓ test/unit/warp/dead-symbols.test.ts (5 tests) 1485ms
     ✓ detects a symbol removed and not re-added  341ms
     ✓ excludes symbols that were removed then re-added  380ms
     ✓ respects maxCommits to limit search depth  311ms
 ✓ test/unit/contracts/capabilities.test.ts (4 tests) 33ms
 ✓ test/unit/session/tripwires.test.ts (15 tests) 32ms
 ✓ tests/playback/CORE_git-graft-enhance.test.ts (6 tests) 1251ms
     ✓ Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?  798ms
     ✓ Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?  428ms
 ✓ test/unit/mcp/runtime-staged-target.test.ts (3 tests) 28ms
 ✓ tests/playback/CORE_v070-structural-history.test.ts (11 tests) 28ms
 ✓ test/unit/warp/context.test.ts (8 tests) 30ms
 ✓ test/unit/cli/doctor-posture.test.ts (7 tests) 761ms
 ✓ tests/playback/0064-same-repo-concurrent-agent-model.test.ts (10 tests) 29ms
 ✓ test/unit/scripts/docker-autostart.test.ts (6 tests) 27ms
 ✓ test/integration/safe-read.test.ts (9 tests) 76ms
 ✓ test/unit/mcp/path-resolver.test.ts (14 tests) 34ms
 ✓ test/unit/parser/lang.test.ts (15 tests) 28ms
 ✓ tests/playback/0060-persisted-sub-commit-local-history.test.ts (9 tests) 29ms
 ✓ test/unit/hooks/posttooluse-read.test.ts (9 tests) 101ms
 ✓ test/unit/release/docker-test-isolation.test.ts (6 tests) 29ms
 ✓ test/unit/hooks/shared.test.ts (17 tests) 28ms
 ✓ test/unit/cli/local-history-dag-model.test.ts (3 tests) 46ms
 ✓ test/unit/metrics/logging.test.ts (7 tests) 48ms
 ✓ test/unit/warp/warp-structural-log.test.ts (6 tests) 945ms
     ✓ respects limit parameter  513ms
 ✓ tests/playback/0062-reactive-workspace-overlay.test.ts (9 tests) 28ms
 ✓ test/unit/warp/refactor-difficulty.test.ts (4 tests) 1057ms
     ✓ combines aggregate churn curvature with reference friction  563ms
 ✓ test/unit/warp/warp-reference-count.test.ts (5 tests) 906ms
     ✓ distinguishes same-named symbols in different files  330ms
 ✓ test/unit/mcp/knowledge-map.test.ts (7 tests) 1274ms
     ✓ tracks multiple files  309ms
 ✓ tests/playback/0078-three-surface-capability-baseline-and-parity-matrix.test.ts (7 tests) 32ms
 ✓ test/unit/operations/knowledge-map.test.ts (5 tests) 38ms
 ✓ tests/playback/CORE_v060-code-review-fixes.test.ts (9 tests) 30ms
 ✓ test/unit/mcp/secret-scrub.test.ts (13 tests) 30ms
 ✓ test/unit/policy/bans.test.ts (43 tests) 33ms
 ✓ test/integration/cli/git-graft-enhance-cli.test.ts (3 tests) 2586ms
     ✓ renders a human review summary for enhance --since in a temp repo  745ms
     ✓ emits schema-validated JSON for enhance --since in a temp repo  489ms
     ✓ supports Git external-command invocation through git graft in a temp repo  1328ms
 ✓ test/unit/warp/references-for-symbol.test.ts (6 tests) 1083ms
     ✓ finds multiple referencing files  366ms
 ✓ tests/playback/0065-between-commit-activity-view.test.ts (10 tests) 28ms
 ✓ test/unit/mcp/receipt-builder.test.ts (9 tests) 41ms
 ✓ test/unit/mcp/monitor-tick-ceiling.test.ts (6 tests) 625ms
 ✓ tests/playback/0077-primary-adapters-thin-use-case-extraction.test.ts (5 tests) 286ms
 ✓ tests/playback/CORE_pr-review-structural-summary.test.ts (2 tests) 524ms
 ✓ test/unit/warp/directory.test.ts (3 tests) 526ms
 ✓ tests/playback/0082-runtime-validated-command-and-context-models.test.ts (3 tests) 27ms
 ✓ tests/playback/0080-warp-port-and-adapter-boundary.test.ts (8 tests) 48ms
 ✓ test/unit/release/three-surface-capability-posture.test.ts (4 tests) 28ms
 ✓ tests/playback/CORE_graft-doctor.test.ts (6 tests) 769ms
 ✓ test/unit/mcp/daemon-repos.test.ts (2 tests) 301ms
 ✓ test/unit/library/index.test.ts (5 tests) 1005ms
     ✓ keeps sync projection bundles non-throwing before parser warmup  774ms
 ✓ test/unit/operations/conversation-primer.test.ts (6 tests) 136ms
 ✓ test/unit/helpers/git.test.ts (6 tests) 94ms
 ✓ tests/playback/CORE_structural-test-coverage-map.test.ts (2 tests) 344ms
 ✓ tests/playback/SURFACE_capability-matrix-truth.test.ts (6 tests) 28ms
 ✓ test/unit/adapters/canonical-json.test.ts (17 tests) 30ms
 ✓ test/unit/mcp/run-capture.test.ts (5 tests) 471ms
 ✓ tests/playback/0089-logical-warp-writer-lanes.test.ts (3 tests) 39ms
 ✓ test/unit/operations/sludge-detector.test.ts (3 tests) 49ms
 ✓ test/unit/cli/command-parser.test.ts (8 tests) 30ms
 ✓ tests/playback/0083-public-api-contract-and-stability-policy.test.ts (4 tests) 27ms
 ✓ test/unit/operations/cross-session-resume.test.ts (5 tests) 154ms
 ✓ test/unit/operations/review-cooldown-status.test.ts (6 tests) 28ms
 ✓ tests/playback/BADCODE_repo-path-resolver-symlink-parent-write-escape.test.ts (4 tests) 30ms
 ✓ test/unit/mcp/worktree-identity-canonicalization.test.ts (5 tests) 71ms
 ✓ tests/playback/0085-projection-bundle-over-buffer-head-for-jedit.test.ts (4 tests) 54ms
 ✓ test/unit/warp/warp-structural-blame.test.ts (4 tests) 795ms
     ✓ tracks signature changes in blame history  308ms
 ✓ test/unit/ports/filesystem-contract.test.ts (10 tests) 35ms
 ✓ tests/playback/0084-projection-basis-and-head-identity-for-jedit-warm-truth.test.ts (4 tests) 55ms
 ✓ test/unit/warp/structural-drift-detection.test.ts (6 tests) 27ms
 ✓ test/unit/warp/full-ast.test.ts (1 test) 148ms
 ✓ test/unit/mcp/semantic-transition-guidance.test.ts (5 tests) 26ms
 ✓ test/unit/ports/guards.test.ts (11 tests) 27ms
 ✓ tests/playback/SURFACE_review-cooldown-status.test.ts (2 tests) 62ms
 ✓ test/unit/release/path-ops-boundary-allowlist.test.ts (2 tests) 34ms
 ✓ test/unit/mcp/runtime-causal-context.test.ts (5 tests) 28ms
 ✓ test/integration/mcp/daemon-bridge.test.ts (1 test) 657ms
 ✓ test/unit/policy/budget.test.ts (7 tests) 29ms
 ✓ tests/playback/CORE_rewrite-structural-blame-to-use-warp-worldline-provenance.test.ts (5 tests) 27ms
 ✓ test/unit/adapters/rotating-ndjson-log.test.ts (3 tests) 41ms
 ✓ test/unit/mcp/typed-seams.test.ts (8 tests) 28ms
 ✓ test/unit/operations/file-outline.test.ts (7 tests) 61ms
 ✓ tests/playback/0079-repo-topology-for-api-cli-and-mcp-primary-adapters.test.ts (6 tests) 27ms
 ✓ test/unit/cli/git-graft-enhance-render.test.ts (3 tests) 27ms
 ✓ test/unit/ports/structural-reading.test.ts (2 tests) 25ms
 ✓ test/unit/warp/outline-diff-trailer.test.ts (6 tests) 27ms
 ✓ tests/playback/0090-symbol-identity-and-rename-continuity.test.ts (3 tests) 44ms
 ✓ test/unit/policy/thresholds.test.ts (10 tests) 29ms
 ✓ tests/playback/WARP_symbol-history-timeline.test.ts (1 test) 818ms
     ✓ Can I read a human symbol timeline from indexed WARP history?  796ms
 ✓ test/unit/mcp/warp-pool.test.ts (3 tests) 26ms
 ✓ test/unit/method/backlog-dependency-dag.test.ts (2 tests) 40ms
 ✓ test/unit/contracts/graft-structural-history-schema.test.ts (4 tests) 28ms
 ✓ test/unit/cli/daemon-status-render.test.ts (2 tests) 22ms
 ✓ test/unit/policy/session-depth.test.ts (7 tests) 29ms
 ✓ test/unit/warp/traverse-hydrate.test.ts (2 tests) 204ms
 ✓ test/unit/cli/index-cmd.test.ts (3 tests) 144ms
 ✓ test/unit/mcp/background-indexing.test.ts (2 tests) 2678ms
     ✓ monitor nudge triggers an immediate tick that indexes  2468ms
 ✓ test/unit/helpers/mcp.test.ts (2 tests) 211ms
 ✓ test/unit/operations/projection-safety.test.ts (11 tests) 29ms
 ✓ tests/playback/0086-release-gate-for-three-surface-capability-posture.test.ts (3 tests) 27ms
 ✓ test/unit/operations/deterministic-replay.test.ts (6 tests) 29ms
 ✓ test/unit/operations/agent-handoff.test.ts (4 tests) 27ms
 ✓ test/unit/mcp/workspace-read-observation.test.ts (4 tests) 29ms
 ✓ tests/playback/WARP_dead-symbol-detection.test.ts (1 test) 942ms
     ✓ Can I list symbols removed from indexed history and not re-added?  920ms
 ✓ test/unit/operations/state.test.ts (5 tests) 30ms
 ✓ test/unit/operations/session-filtration.test.ts (8 tests) 26ms
 ✓ test/unit/git/agent-worktree-hygiene.test.ts (4 tests) 87ms
 ✓ test/integration/mcp/daemon-status-cli.test.ts (1 test) 148ms
 ✓ test/unit/mcp/semantic-transition-summary.test.ts (2 tests) 27ms
 ✓ test/unit/operations/semantic-drift.test.ts (4 tests) 27ms
 ✓ test/unit/mcp/path-boundary-runtime.test.ts (3 tests) 241ms
 ✓ tests/method/0067-async-git-client-via-plumbing.test.ts (2 tests) 72ms
 ✓ test/unit/operations/footprint-parallelism.test.ts (6 tests) 27ms
 ✓ test/unit/mcp/context-guard.test.ts (6 tests) 27ms
 ✓ test/unit/release/package-library-surface.test.ts (6 tests) 28ms
 ✓ test/unit/adapters/node-paths.test.ts (14 tests) 29ms
 ✓ test/unit/cli/structural-blame-render.test.ts (2 tests) 33ms
 ✓ test/unit/library/repo-workspace.test.ts (2 tests) 84ms
 ✓ test/unit/mcp/project-root-resolution.test.ts (3 tests) 129ms
 ✓ test/unit/operations/session-replay.test.ts (5 tests) 26ms
 ✓ test/unit/cli/structural-test-coverage-render.test.ts (1 test) 30ms
 ✓ test/unit/release/security-gate.test.ts (2 tests) 26ms
 ✓ test/unit/release/v080-witness.test.ts (3 tests) 25ms
 ✓ test/unit/operations/read-range.test.ts (6 tests) 26ms
 ✓ test/unit/operations/capture-range.test.ts (5 tests) 26ms
 ✓ test/unit/operations/teaching-hints.test.ts (5 tests) 26ms
 ✓ test/unit/mcp/structural-review-cold-warp.test.ts (1 test) 172ms
 ✓ tests/playback/0092-daemon-session-directory-cleanup.test.ts (3 tests) 49ms
 ✓ test/unit/warp/sym-id-codec.test.ts (5 tests) 28ms
 ✓ test/unit/cli/structural-review-render.test.ts (1 test) 32ms
 ✓ test/unit/git/version-guard.test.ts (4 tests) 26ms
 ✓ tests/playback/0093-structural-queries-use-query-builder.test.ts (4 tests) 26ms
 ✓ test/unit/mcp/precision-warp-slice-first.test.ts (1 test) 141ms
 ✓ test/unit/policy/graftignore.test.ts (5 tests) 28ms
 ✓ test/unit/ports/warp-plumbing-conformance.test.ts (6 tests) 26ms
 ✓ test/unit/mcp/daemon-stdio-bridge.test.ts (3 tests) 32ms
 ✓ test/unit/operations/horizon-of-readability.test.ts (4 tests) 25ms
 ✓ test/unit/operations/adaptive-projection.test.ts (5 tests) 26ms
 ✓ test/unit/session/tripwire-value-object.test.ts (7 tests) 27ms
 ✓ test/unit/warp/writer-id.test.ts (5 tests) 26ms
 ✓ test/unit/scripts/isolated-test-args.test.ts (4 tests) 26ms
 ✓ test/unit/ports/codec-contract.test.ts (7 tests) 27ms
 ✓ test/unit/release/agent-worktree-hygiene-gate.test.ts (1 test) 26ms
 ✓ test/unit/api/tool-bridge.test.ts (3 tests) 36ms
 ✓ test/unit/warp/open.test.ts (2 tests) 130ms
 ✓ test/unit/release/package-files-exist.test.ts (1 test) 25ms
 ✓ test/unit/adapters/node-git.test.ts (1 test) 46ms
 ✓ test/unit/release/code-standards.test.ts (1 test) 25ms
 ✓ tests/playback/0094-references-no-getEdges.test.ts (3 tests) 25ms
 ✓ test/unit/cli/dead-symbols-render.test.ts (1 test) 28ms
 ✓ test/unit/parser/extractor-common.test.ts (1 test) 25ms
 ✓ test/unit/release/package-docs.test.ts (1 test) 24ms
 ✓ test/unit/cli/activity-render.test.ts (1 test) 36ms
 ✓ tests/method/0069-graft-map-bounded-overview.test.ts (2 tests) 227ms
 ✓ test/unit/version.test.ts (1 test) 26ms

 Test Files  223 passed (223)
      Tests  1620 passed (1620)
   Start at  09:01:12
   Duration  76.22s (transform 2.85s, setup 5.51s, import 35.00s, tests 92.14s, environment 15ms)

#0 building with "desktop-linux" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 1.27kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 0.4s

#3 [internal] load .dockerignore
#3 transferring context: 97B done
#3 DONE 0.0s

#4 [deps 1/6] FROM docker.io/library/node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920
#4 DONE 0.0s

#5 [internal] load build context
#5 transferring context: 139.11kB 0.1s done
#5 DONE 0.1s

#6 [deps 6/6] RUN pnpm install --frozen-lockfile --prod=false
#6 CACHED

#7 [deps 2/6] WORKDIR /app
#7 CACHED

#8 [deps 4/6] RUN corepack enable && corepack prepare pnpm@10.30.0 --activate
#8 CACHED

#9 [deps 5/6] COPY package.json pnpm-lock.yaml ./
#9 CACHED

#10 [deps 3/6] RUN apk add --no-cache git
#10 CACHED

#11 [build 1/3] WORKDIR /app
#11 CACHED

#12 [build 2/3] COPY . .
#12 DONE 0.1s

#13 [build 3/3] RUN pnpm build
#13 0.291 
#13 0.291 > @flyingrobots/graft@0.8.0 build /app
#13 0.291 > tsc -p tsconfig.build.json
#13 0.291 
#13 DONE 5.9s

#14 exporting to image
#14 exporting layers 0.1s done
#14 writing image sha256:5761bdf82a353626cfda44d1bdd540a239df1f73cef2c74e5b5279dea79a1508 done
#14 naming to docker.io/library/graft-test:local done
#14 DONE 0.1s

View build details: docker-desktop://dashboard/build/desktop-linux/desktop-linux/j6ysw3r2il9750vpn3hvconzj

```

## Drift Results

```text
No playback-question drift found.
Scanned 1 active cycle, 0 playback questions, 306 test descriptions.
Search basis: normalized match, semantic normalization, or high-confidence token similarity in tests/**/*.test.* and tests/**/*.spec.* descriptions.

```

## Automated Capture

- [x] Test command succeeded: `npm test`.
- [x] Drift check passed: `method drift SURFACE_opened-workspace-paths`.

## Human Verification

To reproduce this verification independently from the workspace root:

```sh
npm test
method drift SURFACE_opened-workspace-paths
```

Expected: the recorded test command exits successfully.
Expected: the recorded drift command exits 0.
