# CLI bounded-read surface

Add CLI peers for the bounded-read capabilities that currently exist
only on MCP.

Scope:
- `safe_read`
- `file_outline`
- `read_range`
- `changed_since`

Goals:
- preserve the same refusal semantics and reason codes
- preserve equivalent JSON meaning where output is machine-readable
- make the CLI a truthful debugging and operator surface for bounded
  reads

Effort: L
