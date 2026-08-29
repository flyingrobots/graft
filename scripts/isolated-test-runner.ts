import { spawnSync } from "node:child_process";
import * as crypto from "node:crypto";
import process from "node:process";
import { retry } from "@git-stunts/alfred";
import {
  formatDockerUnavailableMessage,
  type DockerAvailability,
} from "./docker-availability.js";
import { ensureDockerAvailability } from "./docker-autostart.js";
import {
  applyIsolatedVitestDefaults,
  normalizeVitestArgs,
} from "./isolated-test-args.js";

const DEFAULT_IMAGE = "graft-test:local";
const INVALID_DOCKER_IMAGE_MESSAGE =
  "Invalid GRAFT_TEST_IMAGE: use a non-empty tag prefix without whitespace, '@', or a leading '-'.";
const DEFAULT_DOCKER_BUILD_RETRIES = 1;
const DEFAULT_DOCKER_BUILD_RETRY_DELAY_MS = 1_000;
const TRANSIENT_SPAWN_ERROR_CODES = new Set([
  "EAGAIN",
  "ECONNABORTED",
  "ECONNRESET",
  "EINTR",
  "EPIPE",
  "ETIMEDOUT",
]);

interface RunnerSpawnResult {
  status: number | null;
  error?: NodeJS.ErrnoException;
}

interface RunnerSpawnOptions {
  stdio: "inherit";
  env: NodeJS.ProcessEnv;
}

class DockerBuildFailedError extends Error {
  readonly code = "E_DOCKER_BUILD_FAILED";

  constructor(readonly result: RunnerSpawnResult) {
    super("Docker image build failed");
    this.name = "DockerBuildFailedError";
  }
}

export type RunnerSpawn = (
  command: string,
  args: string[],
  options: RunnerSpawnOptions,
) => RunnerSpawnResult;

export interface IsolatedTestRunnerOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  checkDocker?: () => DockerAvailability | Promise<DockerAvailability>;
  createImageReference?: ((base: string) => string) | undefined;
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
      if (command === "docker") {
        error(
          "Docker is required for all Graft test execution; no host-side fallback is supported.",
        );
      } else {
        error(`Executable \`${command}\` was not found on PATH. Install it or fix PATH.`);
      }
    }
    exit(1);
  }
  exit(result.status ?? 1);
}

function envInteger(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function retryCause(error: unknown): unknown {
  if (
    error instanceof Error
    && "cause" in error
    && error.cause !== undefined
    && error.cause !== error
  ) {
    return error.cause;
  }
  return error;
}

function spawnResultFromError(error: unknown): RunnerSpawnResult | null {
  const cause = retryCause(error);
  if (cause instanceof DockerBuildFailedError) {
    return cause.result;
  }
  if (cause instanceof Error) {
    return {
      status: null,
      error: cause as NodeJS.ErrnoException,
    };
  }
  return null;
}

function retryableDockerBuildError(error: Error): boolean {
  if (error instanceof DockerBuildFailedError) {
    return true;
  }
  const code = "code" in error ? error.code : undefined;
  return typeof code === "string" && TRANSIENT_SPAWN_ERROR_CODES.has(code);
}

function uniqueImageReference(base: string): string {
  const suffix = `${String(process.pid)}-${crypto.randomUUID()}`;
  const lastSlash = base.lastIndexOf("/");
  const lastColon = base.lastIndexOf(":");
  return lastColon > lastSlash ? `${base}-${suffix}` : `${base}:${suffix}`;
}

function spawn(
  command: string,
  args: string[],
  options: Required<IsolatedTestRunnerOptions>,
): RunnerSpawnResult {
  return options.spawn(command, args, {
    stdio: "inherit",
    env: options.env,
  });
}

function succeeded(result: RunnerSpawnResult): boolean {
  return result.error === undefined && result.status === 0;
}

async function runRetriedDockerBuild(
  args: string[],
  options: Required<IsolatedTestRunnerOptions>,
): Promise<void> {
  const retries = envInteger(options.env, "GRAFT_TEST_DOCKER_BUILD_RETRIES", DEFAULT_DOCKER_BUILD_RETRIES);
  const delay = envInteger(
    options.env,
    "GRAFT_TEST_DOCKER_BUILD_RETRY_DELAY_MS",
    DEFAULT_DOCKER_BUILD_RETRY_DELAY_MS,
  );
  try {
    await retry(() => {
      const result = options.spawn("docker", args, {
        stdio: "inherit",
        env: options.env,
      });
      if (result.error !== undefined) {
        throw result.error;
      }
      if (result.status !== 0) {
        throw new DockerBuildFailedError(result);
      }
      return Promise.resolve();
    }, {
      retries,
      delay,
      maxDelay: delay,
      backoff: "constant",
      jitter: "none",
      shouldRetry: retryableDockerBuildError,
      onRetry: (_error, attempt, nextDelay) => {
        options.error(
          `Docker image build failed; retrying attempt ${String(attempt + 1)} after ${String(nextDelay)}ms.`,
        );
      },
    });
  } catch (error: unknown) {
    const result = spawnResultFromError(error);
    if (result !== null) {
      exitFrom(result, "docker", options.error, options.exit);
    }
    throw error;
  }
}

export async function runIsolatedTests(options: IsolatedTestRunnerOptions): Promise<never> {
  const runnerOptions: Required<IsolatedTestRunnerOptions> = {
    checkDocker: options.checkDocker ?? ensureDockerAvailability,
    createImageReference: options.createImageReference ?? uniqueImageReference,
    error: options.error ?? console.error,
    exit: options.exit ?? ((code) => process.exit(code)),
    spawn: options.spawn ?? defaultSpawn,
    argv: options.argv,
    env: options.env,
  };
  const testArgs = applyIsolatedVitestDefaults(normalizeVitestArgs(runnerOptions.argv));

  const imageBase = runnerOptions.env["GRAFT_TEST_IMAGE"] ?? DEFAULT_IMAGE;
  if (imageBase.length === 0 || imageBase.startsWith("-") || imageBase.includes("@") || /\s/u.test(imageBase)) {
    runnerOptions.error(INVALID_DOCKER_IMAGE_MESSAGE);
    runnerOptions.exit(1);
  }
  const image = runnerOptions.createImageReference(imageBase);
  if (image.length === 0 || image.startsWith("-") || image.includes("@") || /\s/u.test(image)) {
    runnerOptions.error(INVALID_DOCKER_IMAGE_MESSAGE);
    runnerOptions.exit(1);
  }
  const dockerAvailability = await runnerOptions.checkDocker();
  if (!dockerAvailability.ok) {
    runnerOptions.error(formatDockerUnavailableMessage(dockerAvailability));
    runnerOptions.exit(1);
  }

  await runRetriedDockerBuild(["build", "--target", "test", "-t", image, "."], runnerOptions);
  const testResult = spawn("docker", [
    "run",
    "--rm",
    "--network",
    "none",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--",
    image,
    "pnpm",
    "exec",
    "vitest",
    "run",
    ...testArgs,
  ], runnerOptions);
  const cleanupResult = spawn("docker", ["image", "rm", image], runnerOptions);
  if (!succeeded(testResult)) {
    return exitFrom(testResult, "docker", runnerOptions.error, runnerOptions.exit);
  }
  if (!succeeded(cleanupResult)) {
    runnerOptions.error(`Failed to remove isolated Docker image reference ${image}.`);
    return exitFrom(cleanupResult, "docker", runnerOptions.error, runnerOptions.exit);
  }
  return runnerOptions.exit(0);
}
