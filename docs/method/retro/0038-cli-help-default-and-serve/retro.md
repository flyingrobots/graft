# Retro — 0038 CLI Help Default And Serve

**Status:** Met  
**Legend:** CORE

## What Shipped

- explicit `serve` CLI command for stdio transport startup
- help-first no-arg CLI behavior for interactive use
- narrow non-interactive compatibility fallback for existing no-arg
  MCP client configs
- updated init-generated MCP snippets and operator docs to use
  `serve`
- regression tests for help, explicit serve, and compatibility mode

## What Changed

The human CLI is less surprising now. Running `graft` without
arguments no longer drops an operator into a raw transport session;
it shows the available surface and makes `serve` the explicit path for
transport startup.

At the same time, older MCP configs keep working because the package
entrypoint upgrades no-arg non-interactive launches to `serve`. That
lets the repo move the public contract forward without a breaking
transport cutover in the same cycle.

## Follow-ons

- `docs/method/backlog/bad-code/CLEAN_CODE_cli-error-actionability.md`
- `docs/method/backlog/up-next/SURFACE_system-wide-mcp-daemon-and-workspace-binding.md`
