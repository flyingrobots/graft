# CLEAN_CODE_mcp-daemon-repo-overview-composition

Legend: CLEAN_CODE
Status: backlog

## Problem

`src/mcp/daemon-repos.ts` currently mixes three responsibilities in one
projection seam:

- filter normalization and authorized repo/worktree resolution
- joining authorized workspaces, daemon sessions, and monitor state
- row-level summarization for the MCP output shape

That is acceptable for the first bounded `daemon_repos` surface, but it
will get harder to evolve once fairness, pressure, or additional
daemon-wide repo views appear.

## Why it matters

- repo-overview filtering and repo-row aggregation will likely grow at
  different rates
- future daemon-wide surfaces should be able to reuse repo grouping
  logic without inheriting this tool’s exact output shape
- keeping this seam small now makes the later fairness cycle less
  likely to turn into another server-level orchestration blob

## Desired shape

- separate filter resolution from repo-state aggregation
- keep repo grouping / reduction reusable across multiple daemon-wide
  projections
- keep MCP output shaping thin so `daemon_repos` remains a bounded
  adapter over reusable repo-summary logic
