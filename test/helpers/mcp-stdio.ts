import { createGraftServer } from "../../src/mcp/server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const projectRoot = process.env["GRAFT_TEST_PROJECT_ROOT"];
const graftDir = process.env["GRAFT_TEST_GRAFT_DIR"];

if (projectRoot === undefined || graftDir === undefined) {
  throw new Error("GRAFT_TEST_PROJECT_ROOT and GRAFT_TEST_GRAFT_DIR are required");
}

const graft = createGraftServer({ projectRoot, graftDir });
const transport = new StdioServerTransport();
await graft.getMcpServer().connect(transport);
