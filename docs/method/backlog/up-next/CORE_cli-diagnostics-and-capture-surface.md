# CLI diagnostics and capture surface

Add CLI peers for the diagnostic and operator-facing capabilities that
currently exist only on MCP.

Scope:
- `doctor`
- `explain`
- `stats`
- `run_capture`

Goals:
- let operators inspect and debug product behavior without an MCP client
- preserve equivalent meaning for health, stats, reasons, and captures
- keep CLI output useful for both humans and scripts

Effort: M
