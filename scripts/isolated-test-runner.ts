import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  checkDockerAvailability,
  formatDockerUnavailableMessage,
  type DockerAvailability,
} from "./docker-availability.js";
import { normalizeVitestArgs } from "./isolated-test-args.js";

const CONTAINER_ENV = "GRAFT_TEST_CONTAINER";
const DEFAULT_IMAGE = "graft-test:local";

interface RunnerSpawnResult {
  status: number | null;
  error?: NodeJS.ErrnoException;
}

interface RunnerSpawnOptions {
  stdio: "inherit";
  env: NodeJS.ProcessEnv;
}

export type RunnerSpawn = (
  command: string,
  args: string[],
  options: RunnerSpawnOptions,
) => RunnerSpawnResult;

export interface IsolatedTestRunnerOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  checkDocker?: () => DockerAvailability;
  error?: (message: string) => void;
  exit?: (code?: number) => never;
  spawn?: RunnerSpawn;
}

function defaultSpawn(
  command: string,
  args: string[],
  options: RunnerSpawnOptions,
): RunnerSpawnResult {
  const result = spawnSync(command, args, options);
  const spawnResult: RunnerSpawnResult = {
    status: result.status,
  };
  if (result.error !== undefined) {
    spawnResult.error = result.error as NodeJS.ErrnoException;
  }
  return spawnResult;
}

function exitFrom(
  result: RunnerSpawnResult,
  command: string,
  error: (message: string) => void,
  exit: (code?: number) => never,
): never {
  if (result.error !== undefined) {
    const message = result.error.message;
    error(`Failed to run ${command}: ${message}`);
    if (result.error.code === "ENOENT") {
      error(
        [
          "Docker is required for `pnpm test`.",
          "Use `pnpm test:local` only for explicit host-side debugging.",
        ].join(" "),
      );
    }
    exit(1);
  }
  exit(result.status ?? 1);
}

function run(command: string, args: string[], options: Required<IsolatedTestRunnerOptions>): never {
  const result = options.spawn(command, args, {
    stdio: "inherit",
    env: options.env,
  });
  exitFrom(result, command, options.error, options.exit);
}

function runChecked(
  command: string,
  args: string[],
  options: Required<IsolatedTestRunnerOptions>,
): void {
  const result = options.spawn(command, args, {
    stdio: "inherit",
    env: options.env,
  });
  if (result.error !== undefined || result.status !== 0) {
    exitFrom(result, command, options.error, options.exit);
  }
}

export function runIsolatedTests(options: IsolatedTestRunnerOptions): never {
  const runnerOptions: Required<IsolatedTestRunnerOptions> = {
    checkDocker: options.checkDocker ?? checkDockerAvailability,
    error: options.error ?? console.error,
    exit: options.exit ?? ((code) => process.exit(code)),
    spawn: options.spawn ?? defaultSpawn,
    argv: options.argv,
    env: options.env,
  };
  const testArgs = normalizeVitestArgs(runnerOptions.argv);

  if (runnerOptions.env[CONTAINER_ENV] === "1") {
    run("pnpm", ["exec", "vitest", "run", ...testArgs], runnerOptions);
  }

  const image = runnerOptions.env["GRAFT_TEST_IMAGE"] ?? DEFAULT_IMAGE;
  const dockerAvailability = runnerOptions.checkDocker();
  if (!dockerAvailability.ok) {
    runnerOptions.error(formatDockerUnavailableMessage(dockerAvailability));
    runnerOptions.exit(1);
  }

  runChecked("docker", ["build", "--target", "test", "-t", image, "."], runnerOptions);
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
  ], runnerOptions);
}
