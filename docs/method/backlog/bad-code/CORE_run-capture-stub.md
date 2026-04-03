# run_capture is still a stub

The `run_capture` MCP tool is registered but returns
`{ message: "not yet implemented" }`. This has been the case
since cycle 0002. Either implement it before 0.1.0 or remove
the registration so agents don't try to use a broken tool.

The design calls for: tee shell output to a log file, return
the last N lines (default 60). The full output lives at a stable
path for follow-up read_range calls.

Affects: `src/mcp/server.ts`, run_capture handler
