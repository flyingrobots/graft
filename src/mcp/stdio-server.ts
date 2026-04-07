import * as path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGraftServer } from "./server.js";

export async function startStdioServer(cwd = process.cwd()): Promise<void> {
  const graft = createGraftServer({
    projectRoot: cwd,
    graftDir: path.join(cwd, ".graft"),
  });
  const transport = new StdioServerTransport();
  await graft.getMcpServer().connect(transport);
}
