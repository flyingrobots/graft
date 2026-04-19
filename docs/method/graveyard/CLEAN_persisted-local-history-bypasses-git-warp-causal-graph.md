---
title: Persisted local history bypasses git-warp causal graph
legend: CLEAN
lane: graveyard
---

# Persisted local history bypasses git-warp causal graph

## Disposition

Retired because repo truth changed: live local-history reads and writes are now graph-backed, and the old `.graft/local-history/*.json` model remains only as explicit migration input.

## Original Proposal

`src/mcp/persisted-local-history.ts` currently stores durable local-history records as JSON files under `.graft/local-history/` keyed by continuity id.

That is the clearest current example of a broader storage-boundary mismatch. `@git-stunts/git-warp` is the causal graph substrate in this project, and persisted repo-internal state should live there rather than as hidden sidecar artifacts under the worktree.

Repo truth today:
- WARP graph storage already goes through `@git-stunts/git-warp` and `@git-stunts/plumbing`
- persisted local history still writes bounded JSON artifacts into `.graft/`
- other repo-internal state still uses `.graft/` paths as an implementation seam
- this defeats one of the main advantages of the graph substrate: internal state is no longer inherently historical, and it leaks into the worktree enough that the repo has to manage exclusion / ignore posture around it

Desired change:
- move durable persisted local-history records off filesystem JSON artifacts and onto a git-warp-backed causal/history surface
- audit the rest of the repo-internal `.graft/` state and move persisted state into the git-warp graph as well
- treat worktree-side `.graft/` persistence as transitional debt, not architectural doctrine
- revisit docs/design/0060 and related retros that currently frame deeper local-history persistence as blocked on upstream `git-warp v17.1.0+` support if that assumption is no longer true

Touched areas likely include:
- `src/mcp/persisted-local-history.ts`
- `src/mcp/tools/activity-view.ts`
- `src/mcp/tools/causal-status.ts`
- `src/mcp/tools/state.ts`
- `src/mcp/runtime-workspace-overlay.ts`
- `src/mcp/runtime-observability.ts`
- `src/mcp/tools/run-capture.ts`
- `docs/design/0060-persisted-sub-commit-local-history/`
- `docs/method/retro/0060-persisted-sub-commit-local-history/`
- any design/retro text that currently treats hidden `.graft/` sidecars as the intended persistence model

Clarification:
- user-authored repo config like `.graftignore` is not the target here
- the problem is hidden repo-internal persisted state that should instead be represented in the graph substrate

Acceptance direction:
- persisted local-history durability is graph-backed, not `.graft/local-history/*.json`
- persisted repo-internal state is graph-backed by default rather than worktree-sidecar-backed
- docs stop overclaiming upstream blockage if git-warp already supports the required causal model
- the project no longer relies on worktree `.graft/` persistence just to keep internal state out of normal git status
