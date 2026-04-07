# CLI and MCP surface parity

Close the remaining CLI and MCP parity gaps after the 0026 audit.

Depends on:
- `docs/design/0026-mcp-cli-parity-audit/parity-matrix.md`
- `docs/method/backlog/up-next/CORE_cli-bounded-read-surface.md`
- `docs/method/backlog/up-next/CORE_cli-structural-navigation-surface.md`
- `docs/method/backlog/up-next/CORE_cli-diagnostics-and-capture-surface.md`
- `docs/method/backlog/up-next/CORE_index-surface-parity-decision.md`
- `docs/method/backlog/up-next/CLEAN_CODE_shared-capability-registry-for-cli-and-mcp.md`

Scope:
- close the concrete parity gaps identified by 0026
- keep exceptions explicit and narrow
- verify the invariant against real surfaces, not intent

Why separate cycle:
- this is the eventual closure cycle after the audit and concrete
  follow-on slices land

Effort: XL
