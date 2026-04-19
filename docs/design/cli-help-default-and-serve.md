---
title: "Cycle 0038 — CLI Help Default And Serve"
---

# Cycle 0038 — CLI Help Default And Serve

**Type:** Feature  
**Legend:** CORE

## Hill

When a human runs `graft` with no arguments, they get help instead of
an unexpected MCP transport session, while MCP clients still have a
truthful, explicit way to start the stdio server without breaking
existing no-arg integrations.

## Playback Questions

### Operator

1. Does `graft` with no arguments print help by default?
2. Is there an explicit `serve` command for starting the MCP stdio
   server?
3. Do the docs and generated config snippets point operators at the
   explicit serve path?

### Integrator

1. Do existing configured MCP clients that still call `graft` with no
   arguments continue to work?
2. Is the compatibility fallback narrow and testable rather than
   spread across entrypoint behavior implicitly?
3. Do init-generated Claude and Codex config snippets use the new
   explicit transport invocation?

## Scope

- add explicit `serve` CLI command
- make no-arg interactive CLI use render help
- preserve old no-arg MCP client behavior through a narrow
  non-interactive compatibility shim
- update generated init MCP snippets and operator docs
- add regression tests for help, serve, and compatibility fallback

## Non-goals

- changing MCP server behavior or tool contracts
- adding a new transport beyond stdio
- removing the compatibility fallback in this cycle

## Key Decisions

### Explicit transport command

`serve` becomes the documented way to start the MCP stdio server:

- `npx @flyingrobots/graft serve`
- `graft serve`

This makes the human CLI less surprising and aligns the transport
startup with explicit intent.

### Compatibility shim stays in the entrypoint

The package entrypoint still upgrades no-arg execution to `serve`
when stdin and stdout are both non-interactive. That preserves
existing MCP configs that invoke `graft` with no args while allowing
interactive no-arg use to become help-first.

### Generated config follows the new truth

All init-generated and documented MCP config should call the package
with `serve` explicitly. The compatibility fallback is for existing
configs, not for new scaffolding.

## Success Criteria

- interactive no-arg CLI execution prints help
- `serve` starts the stdio server explicitly
- init-generated MCP config snippets include `serve`
- configured no-arg MCP clients remain compatible through the
  non-interactive fallback
