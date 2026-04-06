# CLI structural-navigation surface

Add CLI peers for the structural and precision capabilities that
currently exist only on MCP.

Scope:
- `graft_diff`
- `graft_since`
- `graft_map`
- `code_show`
- `code_find`

Goals:
- expose the same core structural capabilities for operator use
- keep JSON meaning aligned with MCP where applicable
- avoid one-command-per-tool literalism if a better CLI namespace
  exists

Effort: L
