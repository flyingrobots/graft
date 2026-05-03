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

- `5` CLI-only capabilities
- `21` API + CLI + MCP capabilities
- `22` API + MCP capabilities
- `1` API-only capability
- `20` direct CLI/MCP peer capabilities
- `1` composed CLI operator/lifecycle capability
- `22` intentionally API + MCP-only agent/control-plane capabilities

API exposure kinds:

- `repo_workspace`: direct typed repo-local service
- `tool_bridge`: available through the direct package surface by using
  `createRepoLocalGraft(...)` plus `callGraftTool(...)`
- `structured_buffer`: direct dirty-buffer editor API

CLI/MCP posture values:

- `peer`: the CLI command is a direct peer for the MCP tool
- `cli_only`: CLI-only lifecycle, operator, debug, or Git-facing
  command by current product decision
- `composed_cli_operator`: the CLI command is a human/operator surface
  that composes one or more existing tool/API truths rather than adding a
  direct CLI peer
- `mcp_only`: intentionally API + MCP-only agent/control-plane tool by
  current product decision
- `not_applicable`: direct API-only capability, so CLI/MCP parity does
  not apply

Pure host/runtime launch commands such as `graft serve`,
`graft serve --runtime daemon`, and `graft daemon` are documented in the
CLI guide rather than as matrix capability rows. They start or route
entry points. They do not expose a repo/tool capability result by
themselves. When a top-level CLI command exposes capability truth by
composing existing tools, it belongs in this matrix as
`composed_cli_operator`; `graft daemon status` is the current example.

## Matrix

| Capability | API | CLI | MCP | API exposure | CLI/MCP posture | CLI path | MCP tool |
|---|---|---|---|---|---|---|---|
| `init` | No | Yes | No | `-` | `cli_only` | `init` | `-` |
| `index` | No | Yes | No | `-` | `cli_only` | `index` | `-` |
| `migrate_local_history` | No | Yes | No | `-` | `cli_only` | `migrate local-history` | `-` |
| `safe_read` | Yes | Yes | Yes | `repo_workspace` | `peer` | `read safe` | `safe_read` |
| `graft_edit` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `graft_edit` |
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
| `graft_log` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct log` | `graft_log` |
| `graft_blame` | Yes | Yes | Yes | `tool_bridge` | `peer` | `symbol blame` | `graft_blame` |
| `graft_difficulty` | Yes | Yes | Yes | `tool_bridge` | `peer` | `symbol difficulty` | `graft_difficulty` |
| `graft_review` | Yes | Yes | Yes | `tool_bridge` | `peer` | `struct review` | `graft_review` |
| `git_graft_enhance` | No | Yes | No | `-` | `cli_only` | `enhance` | `-` |
| `daemon_repos` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_repos` |
| `daemon_status` | Yes | Yes | Yes | `tool_bridge` | `composed_cli_operator` | `daemon status` | `daemon_status` |
| `daemon_sessions` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_sessions` |
| `daemon_monitors` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `daemon_monitors` |
| `monitor_start` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_start` |
| `monitor_pause` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_pause` |
| `monitor_resume` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_resume` |
| `monitor_nudge` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `monitor_nudge` |
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
| `knowledge_map` | Yes | No | Yes | `tool_bridge` | `mcp_only` | `-` | `knowledge_map` |
| `structured_buffer` | Yes | No | No | `structured_buffer` | `not_applicable` | `-` | `-` |
