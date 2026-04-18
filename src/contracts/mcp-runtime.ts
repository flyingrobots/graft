export const MCP_RUNTIME_MODES = ["repo-local", "daemon"] as const;

export type McpRuntimeMode = typeof MCP_RUNTIME_MODES[number];

export function parseMcpRuntimeMode(
  raw: string | undefined,
  flag: string,
): McpRuntimeMode {
  if (raw === undefined) {
    return "repo-local";
  }
  if (raw === "repo-local" || raw === "daemon") {
    return raw;
  }
  throw new Error(`${flag} must be one of: ${MCP_RUNTIME_MODES.join(", ")}`);
}
