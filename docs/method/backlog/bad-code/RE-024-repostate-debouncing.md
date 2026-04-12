# RE-024 — RepoState Debouncing

Legend: [RE — Runtime Engine](../../legends/RE-runtime-engine.md)

## Idea

The `RepoStateTracker.observe()` method is called frequently during MCP tool execution to ensure the "Worldline" context is accurate. Each observation spawns multiple Git subprocesses (status, reflog, rev-parse). In large repositories, this creates significant latency and CPU churn.

Implement a debouncing mechanism: only re-execute raw Git commands if a minimum duration (e.g., 500ms) has passed since the last observation, OR if a "write" operation (e.g., a capture or state save) was performed in the current session.

## Why

1. **Performance**: Reduces the latency of rapid-fire tool calls (e.g., several `safe_read` calls in a row).
2. **Efficiency**: Minimizes unnecessary subprocess spawning.
3. **Responsiveness**: Makes the "interactive" experience feel snappier for the agent.

## Effort

Small — add a `lastObservedAt` timestamp and a dirty-bit to the tracker.
