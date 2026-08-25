#!/usr/bin/env tsx

import { spawnSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_VERSION = "17.0.0";
const packageJsonPath = fileURLToPath(
  import.meta.resolve("@git-stunts/git-warp/package.json"),
);
const packageJson: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const installedVersion = packageJson !== null
  && typeof packageJson === "object"
  && "version" in packageJson
  && typeof packageJson.version === "string"
  ? packageJson.version
  : null;

if (installedVersion !== EXPECTED_VERSION) {
  throw new Error(
    `Expected @git-stunts/git-warp ${EXPECTED_VERSION}, found ${String(installedVersion)}`,
  );
}

const migrationEntrypoint = realpathSync(
  join(dirname(packageJsonPath), "dist", "scripts", "upgrade-v16-to-v17.js"),
);
const result = spawnSync(
  process.execPath,
  [migrationEntrypoint, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

if (result.error !== undefined) {
  throw result.error;
}

if (result.signal !== null) {
  process.kill(process.pid, result.signal);
} else {
  process.exitCode = result.status ?? 1;
}
