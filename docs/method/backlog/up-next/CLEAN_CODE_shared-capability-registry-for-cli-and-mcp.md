# Shared capability registry for CLI and MCP

Create one source of truth for product-facing capabilities so CLI and
MCP do not drift through ad hoc wiring.

Problem:
- MCP capabilities are centralized in `TOOL_REGISTRY`
- CLI capabilities are wired separately in `bin/graft.js` and `src/cli/`
- parity review is currently manual

Goals:
- declare capabilities once
- make peer-surface expectations explicit
- generate or verify docs / parity review from the same registry
- reduce future surface drift

Effort: M
