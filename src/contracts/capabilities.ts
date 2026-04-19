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
  "activity_view",
  "causal_status",
  "causal_attach",
  "workspace_rebind",
  "run_capture",
  "state_save",
  "state_load",
  "set_budget",
  "explain",
  "doctor",
  "stats",
  "graft_churn",
  "graft_exports",
] as const;

export type McpToolName = typeof MCP_TOOL_NAMES[number];

export const CLI_COMMAND_NAMES = [
  "init",
  "index",
  "migrate_local_history",
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
  "diag_activity",
  "diag_local_history_dag",
  "diag_explain",
  "diag_stats",
  "diag_capture",
  "struct_churn",
  "struct_exports",
] as const;

export type CliCommandName = typeof CLI_COMMAND_NAMES[number];

export const ENTRYPOINT_SURFACES = ["api", "cli", "mcp"] as const;

export type EntrypointSurface = typeof ENTRYPOINT_SURFACES[number];

export type ApiExposure = "tool_bridge" | "repo_workspace" | "structured_buffer";

export type CliMcpParity = "peer" | "cli_only" | "mcp_only" | "not_applicable";

export interface CapabilityMatrixRow {
  readonly id: string;
  readonly api: "Yes" | "No";
  readonly cli: "Yes" | "No";
  readonly mcp: "Yes" | "No";
  readonly apiExposure: ApiExposure | "-";
  readonly cliMcpParity: CliMcpParity;
  readonly cliPath: string;
  readonly mcpTool: McpToolName | "-";
}

export interface ThreeSurfaceCapabilityBaseline {
  readonly cliOnly: number;
  readonly apiCliMcp: number;
  readonly apiMcp: number;
  readonly apiOnly: number;
}

export interface CapabilityDefinition {
  readonly id: string;
  readonly description: string;
  readonly mcpTool?: McpToolName | undefined;
  readonly cliCommand?: CliCommandName | undefined;
  readonly cliPath?: readonly [string, ...string[]] | undefined;
  readonly apiExposure?: ApiExposure | undefined;
  readonly surfaces: readonly EntrypointSurface[];
  readonly cliMcpParity: CliMcpParity;
}

interface CapabilitySeed {
  readonly id: string;
  readonly description: string;
  readonly mcpTool?: McpToolName | undefined;
  readonly cliCommand?: CliCommandName | undefined;
  readonly cliPath?: readonly [string, ...string[]] | undefined;
  readonly apiExposure?: ApiExposure | undefined;
  readonly cliMcpParity: CliMcpParity;
}

function defineCapability(seed: CapabilitySeed): CapabilityDefinition {
  const apiExposure = seed.apiExposure ?? (seed.mcpTool !== undefined ? "tool_bridge" : undefined);
  const surfaces: EntrypointSurface[] = [];
  if (apiExposure !== undefined) {
    surfaces.push("api");
  }
  if (seed.cliCommand !== undefined) {
    surfaces.push("cli");
  }
  if (seed.mcpTool !== undefined) {
    surfaces.push("mcp");
  }
  return {
    ...seed,
    ...(apiExposure !== undefined ? { apiExposure } : {}),
    surfaces: Object.freeze(surfaces),
  };
}

export const CAPABILITY_REGISTRY: readonly CapabilityDefinition[] = [
  defineCapability({
    id: "init",
    description: "Initialize graft in a repo",
    cliCommand: "init",
    cliPath: ["init"],
    cliMcpParity: "cli_only",
  }),
  defineCapability({
    id: "index",
    description: "Explicit WARP indexing",
    cliCommand: "index",
    cliPath: ["index"],
    cliMcpParity: "cli_only",
  }),
  defineCapability({
    id: "migrate_local_history",
    description: "Import legacy JSON local history into the WARP graph",
    cliCommand: "migrate_local_history",
    cliPath: ["migrate", "local-history"],
    cliMcpParity: "cli_only",
  }),
  defineCapability({
    id: "safe_read",
    description: "Policy-enforced file read",
    mcpTool: "safe_read",
    cliCommand: "read_safe",
    cliPath: ["read", "safe"],
    apiExposure: "repo_workspace",
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "file_outline",
    description: "Structural file outline",
    mcpTool: "file_outline",
    cliCommand: "read_outline",
    cliPath: ["read", "outline"],
    apiExposure: "repo_workspace",
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "read_range",
    description: "Bounded range read",
    mcpTool: "read_range",
    cliCommand: "read_range",
    cliPath: ["read", "range"],
    apiExposure: "repo_workspace",
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "changed_since",
    description: "Change since last observation",
    mcpTool: "changed_since",
    cliCommand: "read_changed",
    cliPath: ["read", "changed"],
    apiExposure: "repo_workspace",
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "graft_diff",
    description: "Structural diff between refs",
    mcpTool: "graft_diff",
    cliCommand: "struct_diff",
    cliPath: ["struct", "diff"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "graft_since",
    description: "Structural changes since ref",
    mcpTool: "graft_since",
    cliCommand: "struct_since",
    cliPath: ["struct", "since"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "graft_map",
    description: "Structural directory map",
    mcpTool: "graft_map",
    cliCommand: "struct_map",
    cliPath: ["struct", "map"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "code_show",
    description: "Focus on a symbol by name",
    mcpTool: "code_show",
    cliCommand: "symbol_show",
    cliPath: ["symbol", "show"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "code_find",
    description: "Search symbols by name or kind",
    mcpTool: "code_find",
    cliCommand: "symbol_find",
    cliPath: ["symbol", "find"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "code_refs",
    description: "Search import sites, callsites, property access, or text references",
    mcpTool: "code_refs",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "daemon_repos",
    description: "List authorized canonical repos with bounded daemon-wide summary",
    mcpTool: "daemon_repos",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "daemon_status",
    description: "Inspect daemon-wide health and control-plane posture",
    mcpTool: "daemon_status",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "daemon_sessions",
    description: "List active daemon sessions",
    mcpTool: "daemon_sessions",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "daemon_monitors",
    description: "List daemon-managed persistent repo monitors",
    mcpTool: "daemon_monitors",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "monitor_start",
    description: "Start a repo-scoped persistent monitor",
    mcpTool: "monitor_start",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "monitor_pause",
    description: "Pause a repo-scoped persistent monitor",
    mcpTool: "monitor_pause",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "monitor_resume",
    description: "Resume a repo-scoped persistent monitor",
    mcpTool: "monitor_resume",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "monitor_stop",
    description: "Stop a repo-scoped persistent monitor",
    mcpTool: "monitor_stop",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "workspace_authorize",
    description: "Authorize a workspace for daemon binding",
    mcpTool: "workspace_authorize",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "workspace_authorizations",
    description: "List daemon-authorized workspaces",
    mcpTool: "workspace_authorizations",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "workspace_revoke",
    description: "Revoke daemon authorization for a workspace",
    mcpTool: "workspace_revoke",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "workspace_bind",
    description: "Bind a daemon session to a workspace",
    mcpTool: "workspace_bind",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "workspace_status",
    description: "Inspect daemon workspace binding state",
    mcpTool: "workspace_status",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "activity_view",
    description: "Inspect recent bounded local artifact history for the active workspace, anchored to the current commit when possible",
    mcpTool: "activity_view",
    cliCommand: "diag_activity",
    cliPath: ["diag", "activity"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "local_history_dag",
    description: "Render a bounded debug DAG from WARP-backed local history",
    cliCommand: "diag_local_history_dag",
    cliPath: ["diag", "local-history-dag"],
    cliMcpParity: "cli_only",
  }),
  defineCapability({
    id: "causal_status",
    description: "Inspect the active causal workspace and persisted local-history posture",
    mcpTool: "causal_status",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "causal_attach",
    description: "Explicitly declare lawful continuation or handoff for the current causal workspace",
    mcpTool: "causal_attach",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "workspace_rebind",
    description: "Rebind a daemon session to a different workspace",
    mcpTool: "workspace_rebind",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "run_capture",
    description: "Structured shell-output capture",
    mcpTool: "run_capture",
    cliCommand: "diag_capture",
    cliPath: ["diag", "capture"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "explain",
    description: "Explain a reason code",
    mcpTool: "explain",
    cliCommand: "diag_explain",
    cliPath: ["diag", "explain"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "doctor",
    description: "Runtime health and repo state",
    mcpTool: "doctor",
    cliCommand: "diag_doctor",
    cliPath: ["diag", "doctor"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "stats",
    description: "Decision metrics summary",
    mcpTool: "stats",
    cliCommand: "diag_stats",
    cliPath: ["diag", "stats"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "set_budget",
    description: "Session byte budget control",
    mcpTool: "set_budget",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "state_save",
    description: "Session bookmark save",
    mcpTool: "state_save",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "state_load",
    description: "Session bookmark load",
    mcpTool: "state_load",
    cliMcpParity: "mcp_only",
  }),
  defineCapability({
    id: "graft_churn",
    description: "Structural churn report — symbol change frequency hotspots",
    mcpTool: "graft_churn",
    cliCommand: "struct_churn",
    cliPath: ["struct", "churn"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "graft_exports",
    description: "Export surface diff — public API changes between refs",
    mcpTool: "graft_exports",
    cliCommand: "struct_exports",
    cliPath: ["struct", "exports"],
    cliMcpParity: "peer",
  }),
  defineCapability({
    id: "structured_buffer",
    description: "Dirty-buffer structural editor surface for in-process integrations",
    apiExposure: "structured_buffer",
    cliMcpParity: "not_applicable",
  }),
] as const;

export const API_EXPOSED_CAPABILITIES = Object.freeze(
  CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.includes("api")),
);

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

export function buildCapabilityMatrixRows(): readonly CapabilityMatrixRow[] {
  return CAPABILITY_REGISTRY.map((capability) => ({
    id: capability.id,
    api: capability.surfaces.includes("api") ? "Yes" : "No",
    cli: capability.surfaces.includes("cli") ? "Yes" : "No",
    mcp: capability.surfaces.includes("mcp") ? "Yes" : "No",
    apiExposure: capability.apiExposure ?? "-",
    cliMcpParity: capability.cliMcpParity,
    cliPath: capability.cliPath?.join(" ") ?? "-",
    mcpTool: capability.mcpTool ?? "-",
  }));
}

export function buildThreeSurfaceCapabilityBaseline(): ThreeSurfaceCapabilityBaseline {
  return {
    cliOnly: CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join(",") === "cli").length,
    apiCliMcp: CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join(",") === "api,cli,mcp").length,
    apiMcp: CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join(",") === "api,mcp").length,
    apiOnly: CAPABILITY_REGISTRY.filter((capability) => capability.surfaces.join(",") === "api").length,
  };
}
