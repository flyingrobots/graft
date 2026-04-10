export const MCP_TOOL_NAMES = [
  "safe_read",
  "file_outline",
  "read_range",
  "changed_since",
  "graft_diff",
  "graft_since",
  "graft_map",
  "code_show",
  "code_find",
  "code_refs",
  "daemon_repos",
  "daemon_status",
  "daemon_sessions",
  "daemon_monitors",
  "monitor_start",
  "monitor_pause",
  "monitor_resume",
  "monitor_stop",
  "workspace_authorize",
  "workspace_authorizations",
  "workspace_revoke",
  "workspace_bind",
  "workspace_status",
  "causal_status",
  "workspace_rebind",
  "run_capture",
  "state_save",
  "state_load",
  "set_budget",
  "explain",
  "doctor",
  "stats",
] as const;

export type McpToolName = typeof MCP_TOOL_NAMES[number];

export const CLI_COMMAND_NAMES = [
  "init",
  "index",
  "read_safe",
  "read_outline",
  "read_range",
  "read_changed",
  "struct_diff",
  "struct_since",
  "struct_map",
  "symbol_show",
  "symbol_find",
  "diag_doctor",
  "diag_explain",
  "diag_stats",
  "diag_capture",
] as const;

export type CliCommandName = typeof CLI_COMMAND_NAMES[number];

export interface CapabilityDefinition {
  readonly id: string;
  readonly description: string;
  readonly mcpTool?: McpToolName | undefined;
  readonly cliCommand?: CliCommandName | undefined;
  readonly cliPath?: readonly [string, ...string[]] | undefined;
  readonly parity: "peer" | "cli_only" | "mcp_only";
}

export const CAPABILITY_REGISTRY: readonly CapabilityDefinition[] = [
  {
    id: "init",
    description: "Initialize graft in a repo",
    cliCommand: "init",
    cliPath: ["init"],
    parity: "cli_only",
  },
  {
    id: "index",
    description: "Explicit WARP indexing",
    cliCommand: "index",
    cliPath: ["index"],
    parity: "cli_only",
  },
  {
    id: "safe_read",
    description: "Policy-enforced file read",
    mcpTool: "safe_read",
    cliCommand: "read_safe",
    cliPath: ["read", "safe"],
    parity: "peer",
  },
  {
    id: "file_outline",
    description: "Structural file outline",
    mcpTool: "file_outline",
    cliCommand: "read_outline",
    cliPath: ["read", "outline"],
    parity: "peer",
  },
  {
    id: "read_range",
    description: "Bounded range read",
    mcpTool: "read_range",
    cliCommand: "read_range",
    cliPath: ["read", "range"],
    parity: "peer",
  },
  {
    id: "changed_since",
    description: "Change since last observation",
    mcpTool: "changed_since",
    cliCommand: "read_changed",
    cliPath: ["read", "changed"],
    parity: "peer",
  },
  {
    id: "graft_diff",
    description: "Structural diff between refs",
    mcpTool: "graft_diff",
    cliCommand: "struct_diff",
    cliPath: ["struct", "diff"],
    parity: "peer",
  },
  {
    id: "graft_since",
    description: "Structural changes since ref",
    mcpTool: "graft_since",
    cliCommand: "struct_since",
    cliPath: ["struct", "since"],
    parity: "peer",
  },
  {
    id: "graft_map",
    description: "Structural directory map",
    mcpTool: "graft_map",
    cliCommand: "struct_map",
    cliPath: ["struct", "map"],
    parity: "peer",
  },
  {
    id: "code_show",
    description: "Focus on a symbol by name",
    mcpTool: "code_show",
    cliCommand: "symbol_show",
    cliPath: ["symbol", "show"],
    parity: "peer",
  },
  {
    id: "code_find",
    description: "Search symbols by name or kind",
    mcpTool: "code_find",
    cliCommand: "symbol_find",
    cliPath: ["symbol", "find"],
    parity: "peer",
  },
  {
    id: "code_refs",
    description: "Search import sites, callsites, property access, or text references",
    mcpTool: "code_refs",
    parity: "mcp_only",
  },
  {
    id: "daemon_repos",
    description: "List authorized canonical repos with bounded daemon-wide summary",
    mcpTool: "daemon_repos",
    parity: "mcp_only",
  },
  {
    id: "daemon_status",
    description: "Inspect daemon-wide health and control-plane posture",
    mcpTool: "daemon_status",
    parity: "mcp_only",
  },
  {
    id: "daemon_sessions",
    description: "List active daemon sessions",
    mcpTool: "daemon_sessions",
    parity: "mcp_only",
  },
  {
    id: "daemon_monitors",
    description: "List daemon-managed persistent repo monitors",
    mcpTool: "daemon_monitors",
    parity: "mcp_only",
  },
  {
    id: "monitor_start",
    description: "Start a repo-scoped persistent monitor",
    mcpTool: "monitor_start",
    parity: "mcp_only",
  },
  {
    id: "monitor_pause",
    description: "Pause a repo-scoped persistent monitor",
    mcpTool: "monitor_pause",
    parity: "mcp_only",
  },
  {
    id: "monitor_resume",
    description: "Resume a repo-scoped persistent monitor",
    mcpTool: "monitor_resume",
    parity: "mcp_only",
  },
  {
    id: "monitor_stop",
    description: "Stop a repo-scoped persistent monitor",
    mcpTool: "monitor_stop",
    parity: "mcp_only",
  },
  {
    id: "workspace_authorize",
    description: "Authorize a workspace for daemon binding",
    mcpTool: "workspace_authorize",
    parity: "mcp_only",
  },
  {
    id: "workspace_authorizations",
    description: "List daemon-authorized workspaces",
    mcpTool: "workspace_authorizations",
    parity: "mcp_only",
  },
  {
    id: "workspace_revoke",
    description: "Revoke daemon authorization for a workspace",
    mcpTool: "workspace_revoke",
    parity: "mcp_only",
  },
  {
    id: "workspace_bind",
    description: "Bind a daemon session to a workspace",
    mcpTool: "workspace_bind",
    parity: "mcp_only",
  },
  {
    id: "workspace_status",
    description: "Inspect daemon workspace binding state",
    mcpTool: "workspace_status",
    parity: "mcp_only",
  },
  {
    id: "causal_status",
    description: "Inspect the active causal workspace and persisted local-history posture",
    mcpTool: "causal_status",
    parity: "mcp_only",
  },
  {
    id: "workspace_rebind",
    description: "Rebind a daemon session to a different workspace",
    mcpTool: "workspace_rebind",
    parity: "mcp_only",
  },
  {
    id: "run_capture",
    description: "Structured shell-output capture",
    mcpTool: "run_capture",
    cliCommand: "diag_capture",
    cliPath: ["diag", "capture"],
    parity: "peer",
  },
  {
    id: "explain",
    description: "Explain a reason code",
    mcpTool: "explain",
    cliCommand: "diag_explain",
    cliPath: ["diag", "explain"],
    parity: "peer",
  },
  {
    id: "doctor",
    description: "Runtime health and repo state",
    mcpTool: "doctor",
    cliCommand: "diag_doctor",
    cliPath: ["diag", "doctor"],
    parity: "peer",
  },
  {
    id: "stats",
    description: "Decision metrics summary",
    mcpTool: "stats",
    cliCommand: "diag_stats",
    cliPath: ["diag", "stats"],
    parity: "peer",
  },
  {
    id: "set_budget",
    description: "Session byte budget control",
    mcpTool: "set_budget",
    parity: "mcp_only",
  },
  {
    id: "state_save",
    description: "Session bookmark save",
    mcpTool: "state_save",
    parity: "mcp_only",
  },
  {
    id: "state_load",
    description: "Session bookmark load",
    mcpTool: "state_load",
    parity: "mcp_only",
  },
] as const;

export const CLI_COMMAND_PATHS = Object.freeze(Object.fromEntries(
  CAPABILITY_REGISTRY
    .filter((capability) => capability.cliCommand !== undefined && capability.cliPath !== undefined)
    .map((capability) => [capability.cliCommand, capability.cliPath]),
) as Record<CliCommandName, readonly [string, ...string[]]>);

export const CLI_COMMAND_TO_MCP_TOOL = Object.freeze(Object.fromEntries(
  CAPABILITY_REGISTRY
    .filter((capability) => capability.cliCommand !== undefined && capability.mcpTool !== undefined)
    .map((capability) => [capability.cliCommand, capability.mcpTool]),
) as Partial<Record<CliCommandName, McpToolName>>);

export const CLI_ONLY_COMMANDS = Object.freeze(
  CLI_COMMAND_NAMES.filter((command) => CLI_COMMAND_TO_MCP_TOOL[command] === undefined),
);

export function cliCommandPath(command: CliCommandName): readonly [string, ...string[]] {
  return CLI_COMMAND_PATHS[command];
}

export function cliCommandKey(path: readonly string[]): string {
  return path.join(" ");
}
