#!/usr/bin/env node

// Graft - context governor for coding agents.
// Published packages run the built CLI from dist; TypeScript stays dev-only.

import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const binPath = realpathSync(fileURLToPath(import.meta.url));
const entrypointUrl = pathToFileURL(join(dirname(binPath), "../dist/cli/entrypoint.js")).href;

let entrypoint;
try {
  entrypoint = await import(entrypointUrl);
} catch (error) {
  if (error.code === "ERR_MODULE_NOT_FOUND") {
    console.error(
      "[graft] Missing built CLI output. Run `pnpm build` before invoking bin/graft.js from a source checkout.",
    );
  } else {
    console.error("[graft] Failed to load CLI entrypoint from dist.");
  }
  if (process.env.GRAFT_DEBUG === "1") {
    console.error(error);
  }
  process.exit(1);
}

await entrypoint.runCliEntrypoint({
  argv: process.argv.slice(2),
  stdinIsTTY: process.stdin.isTTY,
  stdoutIsTTY: process.stdout.isTTY,
});
