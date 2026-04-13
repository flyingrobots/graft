---
title: "Persisted local history bypasses git-warp causal graph"
legend: CLEAN
lane: bad-code
---

# Persisted local history bypasses git-warp causal graph

`src/mcp/persisted-local-history.ts` currently stores durable local-history records as JSON files under `.graft/local-history/` keyed by continuity id.

That is a storage-boundary mismatch with the repo's stated architecture. `@git-stunts/git-warp` is the causal graph substrate, and persisted local history is causal state, not just scratch runtime data.

Repo truth today:
- WARP graph storage already goes through `@git-stunts/git-warp` and `@git-stunts/plumbing`
- persisted local history still writes bounded JSON artifacts into `.graft/`
- `.graft/` should remain acceptable for ephemeral runtime/logging/session scratch, but durable causal history should not bypass the graph substrate

Desired change:
- move durable persisted local-history records off filesystem JSON artifacts and onto a git-warp-backed causal/history surface
- keep `.graft/` only for ephemeral runtime concerns unless there is a strong reason otherwise
- revisit docs/design/0060 and related retros that currently frame deeper local-history persistence as blocked on upstream `git-warp v17.1.0+` support if that assumption is no longer true

Touched areas likely include:
- `src/mcp/persisted-local-history.ts`
- `src/mcp/tools/activity-view.ts`
- `src/mcp/tools/causal-status.ts`
- `src/mcp/tools/state.ts` only insofar as it should remain explicitly non-causal scratch state
- `docs/design/0060-persisted-sub-commit-local-history/`
- `docs/method/retro/0060-persisted-sub-commit-local-history/`

Acceptance direction:
- persisted local-history durability is graph-backed, not `.graft/local-history/*.json`
- docs stop overclaiming upstream blockage if git-warp already supports the required causal model
- runtime scratch/logging boundaries remain explicit and separate from durable causal history
