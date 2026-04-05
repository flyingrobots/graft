# Multi-agent conflict detection

If two agents work on the same codebase concurrently, graft's
observation cache could detect when one agent modifies a file
another is reading.

"Agent B just modified src/server.ts — here's the structural diff
since your last read."

Requires: shared observation state across MCP sessions (currently
each session is isolated). Could use the .graft/ directory as
shared state, or a lightweight IPC mechanism.

Pairs with: WARP causal-write-tracking.
