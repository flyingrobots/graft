---
title: "Background WARP indexing"
requirements:
  - "WARP Level 1 indexing (shipped)"
  - "Worldline seek API (shipped)"
  - "Incremental indexer (backlog — indexer perf improvements)"
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

Depends on: WARP Level 1 (shipped), indexer perf improvements.
