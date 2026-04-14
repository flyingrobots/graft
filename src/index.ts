import * as path from "node:path";
import {
  MCP_TOOL_NAMES,
  type McpToolName,
} from "./contracts/capabilities.js";
import { getMcpOutputSchema } from "./contracts/output-schemas.js";
import { startDaemonServer, type GraftDaemonServer, type StartDaemonServerOptions } from "./mcp/daemon-server.js";
import { createGraftServer, type CreateGraftServerOptions, type GraftServer, type McpToolResult } from "./mcp/server.js";
import { startStdioServer } from "./mcp/stdio-server.js";
import { GRAFT_VERSION } from "./version.js";

export interface CreateRepoLocalGraftOptions extends Omit<CreateGraftServerOptions, "mode" | "projectRoot" | "graftDir"> {
  readonly cwd?: string | undefined;
  readonly graftDir?: string | undefined;
}

export function createRepoLocalGraft(options: CreateRepoLocalGraftOptions = {}): GraftServer {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  return createGraftServer({
    ...options,
    mode: "repo_local",
    projectRoot: cwd,
    graftDir: options.graftDir ?? path.join(cwd, ".graft"),
  });
}

export function parseGraftToolPayload(result: McpToolResult): Record<string, unknown> {
  const payload = result.content.find((item) => item.type === "text");
  if (payload === undefined) {
    throw new Error("Graft tool result did not contain a text payload");
  }
  const parsed = JSON.parse(payload.text) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Graft tool result was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export async function callGraftTool<T extends Record<string, unknown> = Record<string, unknown>>(
  graft: GraftServer,
  name: McpToolName,
  args: Record<string, unknown>,
): Promise<T> {
  const parsed = parseGraftToolPayload(await graft.callTool(name, args));
  return getMcpOutputSchema(name).parse(parsed) as T;
}

export {
  GRAFT_VERSION,
  MCP_TOOL_NAMES,
  createGraftServer,
  startDaemonServer,
  startStdioServer,
};

export type {
  CreateGraftServerOptions,
  GraftDaemonServer,
  GraftServer,
  McpToolName,
  McpToolResult,
  StartDaemonServerOptions,
};
