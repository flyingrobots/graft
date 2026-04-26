import { spawnSync } from "node:child_process";
import process from "node:process";
import { normalizeVitestArgs } from "./isolated-test-args.js";

const CONTAINER_ENV = "GRAFT_TEST_CONTAINER";
const DEFAULT_IMAGE = "graft-test:local";

function exitFrom(result: ReturnType<typeof spawnSync>, command: string): never {
  if (result.error !== undefined) {
    const message = result.error.message;
    console.error(`Failed to run ${command}: ${message}`);
    if ("code" in result.error && result.error.code === "ENOENT") {
      console.error("Docker is required for `pnpm test`. Use `pnpm test:local` only for explicit host-side debugging.");
    }
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

function run(command: string, args: string[]): never {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  exitFrom(result, command);
}

function runChecked(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error !== undefined || result.status !== 0) {
    exitFrom(result, command);
  }
}

const testArgs = normalizeVitestArgs(process.argv.slice(2));

if (process.env[CONTAINER_ENV] === "1") {
  run("pnpm", ["exec", "vitest", "run", ...testArgs]);
}

const image = process.env["GRAFT_TEST_IMAGE"] ?? DEFAULT_IMAGE;

runChecked("docker", ["build", "--target", "test", "-t", image, "."]);
run("docker", [
  "run",
  "--rm",
  "--network",
  "none",
  "-e",
  `${CONTAINER_ENV}=1`,
  image,
  "pnpm",
  "exec",
  "vitest",
  "run",
  ...testArgs,
]);
