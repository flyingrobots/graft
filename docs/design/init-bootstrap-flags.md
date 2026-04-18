---
title: "Cycle 0037 — Init Bootstrap Flags"
---

# Cycle 0037 — Init Bootstrap Flags

**Type:** Feature  
**Legend:** CORE

## Hill

When an operator runs `graft init`, they can bootstrap project-local
Claude or Codex configuration in one step instead of copying printed
snippets by hand, and rerunning the command stays idempotent.

## Playback Questions

### Operator

1. Can `graft init` write project-local Claude MCP config, Claude
   hook config, and Codex MCP config with explicit flags?
2. If those config files already exist, does `graft init` merge graft
   entries without clobbering unrelated settings?
3. Is the default `graft init` behavior still safe and non-surprising
   when no write flags are passed?

### Integrator

1. Does `graft init --json` continue to validate against the declared
   CLI schema?
2. Are the new write paths deterministic and idempotent across JSON
   and TOML config files?
3. Do the operator docs teach the one-step bootstrap flow clearly?

## Scope

- explicit project-local write flags for Claude MCP, Claude hooks, and
  Codex MCP config
- merge-safe config writers for JSON and TOML
- init witnesses for existing-file merge behavior
- README and guide updates for one-step bootstrap

## Non-goals

- writing global editor / agent config in `~`
- changing MCP transport behavior or hook semantics
- new init flags for non-Claude / non-Codex clients

## Key Decisions

### Explicit write flags only

`graft init` stays conservative by default. It still scaffolds repo
files and prints manual snippets unless the operator opts into direct
config writes with explicit flags:

- `--write-claude-mcp`
- `--write-claude-hooks`
- `--write-codex-mcp`

### Project-local targets

The write flags target project-local config only:

- `.mcp.json`
- `.claude/settings.json`
- `.codex/config.toml`

This keeps bootstrap predictable and avoids mutating a user's global
agent/editor config without an explicit separate workflow.

### Merge, not overwrite

Existing config files are preserved. Graft only adds its own entries
when missing and treats reruns as `exists`, not duplication.

## Success Criteria

- `graft init` can directly write the supported project-local config
  files behind explicit flags
- rerunning the command does not duplicate graft config entries
- existing JSON / TOML config is preserved during merge
- README and setup guide show the one-step bootstrap flow
