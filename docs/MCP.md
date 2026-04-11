# MCP Guide

This is the shortest signpost for Graft's MCP surface.

Use MCP when an agent or editor should call Graft directly as a tool
provider.

## Startup

Stdio MCP:

```bash
npx @flyingrobots/graft serve
```

Local daemon:

```bash
npx @flyingrobots/graft daemon
```

## Key tool groups

- bounded reads: `safe_read`, `file_outline`, `read_range`, `changed_since`
- structural history: `graft_diff`, `graft_since`, `graft_map`
- precision: `code_show`, `code_find`, `code_refs`
- activity and footing: `activity_view`, `causal_status`, `causal_attach`, `doctor`
- daemon control plane: `daemon_status`, `daemon_repos`, `daemon_sessions`, monitor tools

## Current release-facing truth

- MCP is still the primary agent surface
- responses carry versioned `_schema` metadata
- `activity_view` is the first honest human-facing between-commit
  surface, but its truth class is still bounded local
  `artifact_history`

## Related docs

- [README](../README.md)
- [Setup Guide](GUIDE.md)
- [CLI Guide](CLI.md)
- [Advanced Guide](ADVANCED_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)
