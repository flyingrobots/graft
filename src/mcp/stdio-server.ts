import * as path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGraftServer } from "./server.js";

export interface StartStdioServerOptions {
  readonly runtime: "stdio" | "daemon";
  readonly socketPath?: string;
}

function resolveProjectRoot(cwd: string): string {
  const fromEnv = process.env["GRAFT_PROJECT_ROOT"]?.trim();
  if (fromEnv !== undefined && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }
  return cwd;
}

export async function startStdioServer(cwd = process.cwd()): Promise<void> {
  const projectRoot = resolveProjectRoot(cwd);
  const graft = createGraftServer({
    projectRoot,
    graftDir: path.join(projectRoot, ".graft"),
  });
  const transport = new StdioServerTransport();
  await graft.getMcpServer().connect(transport);
}
