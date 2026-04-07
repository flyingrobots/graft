# Retro — 0041 Client Bootstrap Parity

**Status:** Met  
**Legend:** CORE

## What Shipped

- explicit init write flags for Cursor, Windsurf, Continue, and Cline
  project-local MCP config
- merge-safe JSON writers for those config targets
- witnesses covering create, merge, and rerun idempotence
- README and setup-guide updates for per-client one-step bootstrap

## What Changed

`graft init` no longer has a DX cliff after Claude and Codex. The
documented client surface now has the same one-step bootstrap posture
across the supported project-local config files.

The write paths stay intentionally narrow: project-local only, no
global editor mutations, and no overwriting unrelated existing
settings.

## Follow-ons

- `docs/method/backlog/up-next/CORE_operator-setup-decision-table.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
