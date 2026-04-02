import { createGraftServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const graft = createGraftServer();
const transport = new StdioServerTransport();
await graft.getMcpServer().connect(transport);
