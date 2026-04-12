# HT-006 — Implicit Daemon Binding

Legend: [CORE — Core Governor](../../legends/CORE-core-governor.md)

## Idea

In `daemon` mode, a session starts `unbound` and requires an explicit `workspace_bind` tool call before any repository-scoped tools (like `safe_read`) can be used. This is a friction point for agents who are used to stateless MCP environments.

Implement "Implicit Binding": if a repo-scoped tool is called with a path and the session is unbound, Graft should attempt to auto-resolve the worktree root and git-common-dir. If successful and authorized, it should bind the session and execute the tool in one step.

## Why

1. **UX/DX**: Reduces the "Time-to-Value" for agents.
2. **Compatibility**: Makes the daemon mode behave more like the stdio server for standard read operations.
3. **Ergonomics**: Removes the need for the agent to "remember" to bind if they already have a file path.

## Effort

Small-Medium — update the `enforceDaemonToolAccess` logic to trigger an internal bind if path-identifiable evidence exists.
