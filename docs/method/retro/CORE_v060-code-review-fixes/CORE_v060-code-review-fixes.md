---
title: "v0.6.0 code review fixes"
cycle: "CORE_v060-code-review-fixes"
design_doc: "docs/design/CORE_v060-code-review-fixes.md"
outcome: hill-met
drift_check: yes
---

# v0.6.0 code review fixes Retro

## Summary

Hill met. All 7 findings from the Codex Level 10 code review were
fixed via 6 parallel agents, integrated, and verified.

## What shipped

1. **Path resolver security** — absolute paths now confined to project
   root. Symlink escapes caught via `fs.realpathSync` double-check.
   12 new invariant tests including symlink directory and file escapes.

2. **WARP symbol disambiguation** — `symNodeId` now uses qualified
   names from `buildSymbolPath` (e.g. `Header.render` vs
   `Footer.render`). Existing infrastructure was already computing
   qualified paths but not using them for node IDs.

3. **WARP indexer error propagation** — `IndexResult` is now a
   discriminated union (`ok: true | ok: false`). Git failures
   propagate instead of producing silently empty graphs.

4. **Daemon session cleanup** — `removeSessionDirectory()` runs on
   close/error. Cleanup failures logged but don't crash.

5. **Rotating log preservation** — rotation skipped when halving
   would produce empty result.

6. **graft_map output caps** — `MAX_MAP_FILES=100`,
   `MAX_MAP_BYTES=50000`. Budget-exhausted sessions get compact
   `BUDGET_EXHAUSTED` response.

## What surprised us

1. The qualified symbol path infrastructure (`buildSymbolPath`)
   already existed in `indexer-graph.ts` — it just wasn't being
   passed to `symNodeId`. The fix was threading an existing value
   to existing call sites, not building new infrastructure.

2. Agent A's path confinement fix required updating ~7 test files
   that depended on the old absolute-path-passthrough behavior.
   Tests were using `/tmp` fixture paths that were "outside" the
   test server's project root.

3. The integration merge between agents B (qualified names) and C
   (error union) both touching `indexer.ts` required a manual merge
   agent. Non-overlapping worktree changes work great; same-file
   changes from independent agents need conflict resolution.

## Metrics

- **Findings fixed**: 7/7 (1 critical, 2 high, 4 medium)
- **Agents deployed**: 6 parallel + 2 integration
- **New test files**: 4
- **Witness tests**: 10/10 passing
- **Drift**: zero
