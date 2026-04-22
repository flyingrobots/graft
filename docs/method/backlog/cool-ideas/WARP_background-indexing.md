---
title: "Background WARP indexing"
legend: WARP
lane: cool-ideas
effort: M
blocked_by:
  - monitor-tick-ceiling-tracking
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Worldline seek API (shipped)"
  - "Monitor tick ceiling tracking (backlog)"
acceptance_criteria:
  - "WARP indexing runs in the background on MCP server startup without blocking tool responses"
  - "Post-commit hook triggers incremental indexing of new commits only"
  - "Only commits since the last indexed position are processed (monotonic worldline growth)"
  - "When indexing completes, WARP-backed tools automatically read from the graph instead of reparsing"
  - "Agent tool calls are never blocked waiting for background indexing to finish"
  - "A test verifies that a tool call during active indexing returns results (possibly stale) without hanging"
---

# Background WARP indexing

Index incrementally on MCP server startup or via post-commit hook.
The agent never waits for indexing — it happens in the background.

When complete, the projection-before-parse invariant activates
automatically: WARP-backed tools read from the graph instead of
reparsing.

Incremental: only index commits since the last indexed position.
The worldline grows monotonically.

## Implementation path

1. **Tick ceiling** (prerequisite): `monitor-tick-ceiling-tracking`
   provides the "last indexed SHA" — the foundation for knowing
   where to resume.
2. **Background worker**: On MCP startup, spawn a background task
   that runs `indexHead` for any commits between the ceiling and
   current HEAD.
3. **Post-commit hook**: Trigger a re-index when a new commit
   lands. Only processes the delta since ceiling.
4. **Non-blocking reads**: Tool calls during indexing return results
   from the last-completed index (possibly stale). No waiting.
5. **Automatic switchover**: Once indexing completes, WARP-backed
   tools silently switch to graph reads.

## Why blocked by monitor-tick-ceiling-tracking

Without tracking the last indexed SHA, background indexing can't
know "where it left off." The ceiling card provides that foundation:
compare HEAD against the last indexed commit, skip if unchanged,
re-index if different. Background indexing extends this from
"skip or full re-index" to "index only the delta."

## Related cards

- **CORE_opt-in-daemon-mode**: Daemon mode could host background
  indexing, but it's not a hard dependency — background indexing
  works without a daemon (MCP startup + hooks).
- **CORE_daemon-aware-stdio-bridge**: Same relationship — the
  bridge is a transport concern, not an indexing concern.

## No downstream blockers

All WARP-based features work with on-demand indexing today.
Background indexing is an optimization — it makes the graph
fresher faster, but nothing gates on it.

## Effort rationale

Medium. The core logic (delta detection, background worker) is
straightforward. The complexity is in non-blocking concurrent
access: ensuring tool reads don't conflict with background writes,
and that the switchover from stale to fresh is atomic.
