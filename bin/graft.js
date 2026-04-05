#!/usr/bin/env node

// Graft — context governor for coding agents
// Bootstrap: re-exec with tsx loader resolved from the package's own deps.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// If already running under tsx, proceed directly
if (process.env.__GRAFT_TSX_LOADED === "1") {
  const command = process.argv[2];
  if (command === "init") {
    const { runInit } = await import("../src/cli/init.js");
    runInit();
  } else if (command === "index") {
    const { runIndex } = await import("../src/cli/index-cmd.js");
    await runIndex();
  } else {
    const { createGraftServer } = await import("../src/mcp/server.js");
    const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
    const graft = createGraftServer();
    const transport = new StdioServerTransport();
    await graft.getMcpServer().connect(transport);
  }
} else {
  // Re-exec with tsx loader from our own node_modules
  const tsxPath = require.resolve("tsx/esm");
  const script = join(__dirname, "graft.js");
  try {
    execFileSync(process.execPath, ["--import", tsxPath, script, ...process.argv.slice(2)], {
      stdio: "inherit",
      env: { ...process.env, __GRAFT_TSX_LOADED: "1" },
    });
  } catch (err) {
    process.exit(err?.status ?? 1);
  }
}
