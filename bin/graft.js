#!/usr/bin/env -S node --import tsx

// Graft MCP server — stdio transport
// Usage: npx @flyingrobots/graft

import { createGraftServer } from "../src/mcp/server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const graft = createGraftServer();
const transport = new StdioServerTransport();
await graft.getMcpServer().connect(transport);
