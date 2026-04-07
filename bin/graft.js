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
  const { resolveEntrypointArgs, runCli } = await import("../src/cli/main.js");
  await runCli({
    args: resolveEntrypointArgs(process.argv.slice(2), process.stdin.isTTY, process.stdout.isTTY),
  });
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
