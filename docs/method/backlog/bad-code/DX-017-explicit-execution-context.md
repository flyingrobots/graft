# DX-017 — Explicit Execution Context

Legend: [DX — Developer Experience](../../legends/DX-developer-experience.md)

## Idea

`server.ts` and `workspace-router.ts` currently rely heavily on `AsyncLocalStorage` to manage the "Active Execution Context." While this keeps the tool handler signatures clean, it creates a "magic" ambient state that is difficult to trace, mock, or debug.

Refactor the MCP tool handler signature to explicitly receive the `WorkspaceExecutionContext`. This makes the data flow obvious and allows the compiler to enforce context availability at the tool level rather than throwing runtime errors.

## Why

1. **Maintainability**: Makes the relationship between tool calls and workspace slices explicit.
2. **Testability**: Simplifies unit testing of individual tool handlers without needing to set up the full `AsyncLocalStorage` harness.
3. **Transparency**: Aligns with the "Runtime Truth Wins" invariant.

## Effort

Medium — requires updating all tool definitions and the `invokeTool` orchestration.
