# Cycle 0041 — Client Bootstrap Parity

**Type:** Feature  
**Legend:** CORE

## Hill

When an operator runs `graft init`, they can bootstrap every
documented project-local client config in one step instead of copying
MCP snippets by hand, and rerunning the command stays idempotent.

## Playback Questions

### Operator

1. Can `graft init` write project-local MCP config for Cursor,
   Windsurf, Continue, and Cline with explicit flags?
2. If those files already exist, does `graft init` merge graft entries
   without clobbering unrelated settings?
3. Is the default `graft init` behavior still conservative when no
   write flags are passed?

### Integrator

1. Do the new write paths stay deterministic and idempotent across the
   supported JSON formats?
2. Does `graft init --json` continue to validate against the declared
   CLI schema?
3. Do README and GUIDE give each supported client a one-step bootstrap
   command instead of manual copy-paste only?

## Scope

- explicit project-local write flags for Cursor, Windsurf, Continue,
  and Cline MCP config
- merge-safe JSON writers for those config targets
- init witnesses for create, merge, and rerun idempotence
- README and setup-guide updates for per-client bootstrap commands

## Non-goals

- writing global editor or agent config in `~`
- changing Claude / Codex bootstrap semantics
- changing MCP transport behavior

## Key Decisions

### Explicit client flags

`graft init` remains conservative by default. Direct writes happen only
when the operator opts into them with explicit flags:

- `--write-cursor-mcp`
- `--write-windsurf-mcp`
- `--write-continue-mcp`
- `--write-cline-mcp`

### Project-local targets only

The new write paths target project-local config files only:

- `.cursor/mcp.json`
- `.codeium/windsurf/mcp_config.json`
- `.continue/config.json`
- `.vscode/cline_mcp_settings.json`

This keeps `init` predictable and avoids mutating global editor config
without a separate explicit workflow.

### Narrow merge posture

Existing config files are preserved. Graft only adds its own MCP entry
when missing and treats reruns as `exists`, not duplication.

## Success Criteria

- `graft init` can directly write every documented project-local
  client config
- rerunning the command does not duplicate graft entries
- existing JSON config is preserved during merge
- README and GUIDE teach a one-step bootstrap command for each
  supported client
