# Three-Surface Capability Matrix

This is the current baseline capability map for Graft’s three official
entry points:

- API
- CLI
- MCP

The matrix is descriptive repo truth, not a promise that every
capability should exist on every surface.

This document is release-gated against the capability registry and the
documented public API posture. If the registry or semver-public surface
changes, this matrix must be refreshed before release.

## Current baseline

- `4` CLI-only capabilities
- `16` API + CLI + MCP capabilities
- `20` API + MCP capabilities
- `1` API-only capability

API exposure kinds:

- `repo_workspace`: direct typed repo-local service
- `tool_bridge`: available through the direct package surface by using
  `createRepoLocalGraft(...)` plus `callGraftTool(...)`
- `structured_buffer`: direct dirty-buffer editor API

CLI/MCP posture values:

- `peer`: both CLI and MCP are intentionally present
- `cli_only`: CLI-only by current product decision
- `mcp_only`: MCP-only by current product decision
- `not_applicable`: direct API-only capability, so CLI/MCP parity does
  not apply

## Matrix

| Capability | API | CLI | MCP | API exposure | CLI/MCP posture | CLI path | MCP tool |
|---|---|---|---|---|---|---|---|
| `init` | No | Yes | No | `-` | `cli_only` | `init` | `-` |
| `index` | No | Yes | No | `-` | `cli_only` | `index` | `-` |
| `migrate_local_history` | No | Yes | No | `-` | `cli_only` | `migrate local-history` | `-` |
| `safe_read` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read safe` | `safe_read` |
| `file_outline` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read outline` | `file_outline` |
| `read_range` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read range` | `read_range` |
| `changed_since` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read changed` | `changed_since` |
| `graft_diff` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct diff` | `graft_diff` |
| `graft_since` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct since` | `graft_since` |
| `graft_map` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct map` | `graft_map` |
| `code_show` | Yes | Yes | Yes | `tool_bridge` | `peer` | `symbol show` | `code_show` |
| `code_find` | Yes | Yes | Yes | `tool_bridge` | `peer` | `symbol find` | `code_find` |
| `code_refs` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `code_refs` |
| `graft_churn` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct churn` | `graft_churn` |
| `graft_exports` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct exports` | `graft_exports` |
| `daemon_repos` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_repos` |
| `daemon_status` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_status` |
| `daemon_sessions` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_sessions` |
| `daemon_monitors` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_monitors` |
| `monitor_start` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_start` |
| `monitor_pause` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_pause` |
| `monitor_resume` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_resume` |
| `monitor_stop` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_stop` |
| `workspace_authorize` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `workspace_authorize` |
| `workspace_authorizations` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `workspace_authorizations` |
| `workspace_revoke` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `workspace_revoke` |
| `workspace_bind` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `workspace_bind` |
| `workspace_status` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `workspace_status` |
| `activity_view` | Yes | Yes | Yes | `tool_bridge` | `peer` | `diag activity` | `activity_view` |
| `local_history_dag` | No | Yes | No | `-` | `cli_only` | `diag local-history-dag` | `-` |
| `causal_status` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `causal_status` |
| `causal_attach` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `causal_attach` |
| `workspace_rebind` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `workspace_rebind` |
| `run_capture` | Yes | Yes | Yes | `tool_bridge` | `peer` | `diag capture` | `run_capture` |
| `explain` | Yes | Yes | Yes | `tool_bridge` | `peer` | `diag explain` | `explain` |
| `doctor` | Yes | Yes | Yes | `tool_bridge` | `peer` | `diag doctor` | `doctor` |
| `stats` | Yes | Yes | Yes | `tool_bridge` | `peer` | `diag stats` | `stats` |
| `set_budget` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `set_budget` |
| `state_save` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `state_save` |
| `state_load` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `state_load` |
| `structured_buffer` | Yes | No | No | `structured_buffer` | `not_applicable` | `-` | `-` |
