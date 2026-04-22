---
title: "Multi-agent conflict detection"
requirements:
  - "Observation cache (shipped)"
  - "Session tracking (shipped)"
  - "Shared observation state across MCP sessions (not shipped)"
acceptance_criteria:
  - "When agent B modifies a file that agent A has read, agent A is notified with a structural diff"
  - "Conflict detection works across concurrent MCP sessions on the same codebase"
  - "Shared state uses .graft/ directory or lightweight IPC — no external service required"
  - "Detection latency is under 1 second from write to notification"
---

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
