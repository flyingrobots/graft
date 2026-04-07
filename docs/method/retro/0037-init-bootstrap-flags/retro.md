# Retro — 0037 Init Bootstrap Flags

**Status:** Met  
**Legend:** CORE

## What Shipped

- explicit init write flags for project-local Claude MCP, Claude
  hooks, and Codex MCP config
- merge-safe JSON and TOML writers for those config targets
- witnesses covering create, merge, and rerun idempotence
- README and setup-guide updates for one-step bootstrap

## What Changed

`graft init` is no longer just a scaffold-and-copy command. It can now
bootstrap the most common local agent config directly while preserving
the conservative default behavior when no write flags are passed.

The JSON and TOML merge paths stay narrow on purpose: project-local
only, no global config writes, and no overwriting unrelated existing
settings.

## Follow-ons

- `docs/method/backlog/bad-code/CLEAN_CODE_cli-default-stdio-surprise.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_cli-error-actionability.md`
- `docs/method/backlog/bad-code/CLEAN_CODE_sync-child-process-request-path.md`
