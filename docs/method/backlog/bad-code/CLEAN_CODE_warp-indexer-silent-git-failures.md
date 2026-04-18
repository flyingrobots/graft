---
title: "WARP indexer silently swallows git failures"
legend: CLEAN_CODE
lane: bad-code
---

# WARP indexer silently swallows git failures

Source: v0.6.0 code review (Codex Level 10)

`listCommits()`, `getCommitChanges()`, and parent resolution in `indexer-git.ts` all return empty arrays or null on git errors instead of propagating failures. A broken git invocation produces a partial or empty graph with no signal that anything went wrong.

Files: `src/warp/indexer-git.ts:22,33,64`, `src/warp/indexer.ts:33`

Desired fix: git failures should propagate as explicit errors or produce a result that carries error metadata (e.g. `{ ok: false, reason: "git_error" }`). Silent empty returns are not acceptable for a system that claims to track structural truth.

Effort: M
