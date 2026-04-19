---
title: "Background WARP indexing"
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
