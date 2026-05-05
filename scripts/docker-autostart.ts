import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  checkDockerAvailability,
  type DockerAvailability,
  type DockerProbeResult,
  type DockerProbeRunner,
} from "./docker-availability.js";

export type DockerLaunchRunner = (
  command: string,
  args: readonly string[],
) => DockerProbeResult;

export interface DockerAutostartOptions {
  readonly runProbe?: DockerProbeRunner | undefined;
  readonly runLaunch?: DockerLaunchRunner | undefined;
  readonly platform?: NodeJS.Platform | undefined;
  readonly timeoutMs?: number | undefined;
  readonly pollIntervalMs?: number | undefined;
  readonly sleep?: ((milliseconds: number) => Promise<void> | void) | undefined;
}

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_PROBE_TIMEOUT_MS = 10_000;

function defaultCommandRunner(command: string, args: readonly string[]): DockerProbeResult {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
    timeout: DEFAULT_PROBE_TIMEOUT_MS,
  });
  const probe: DockerProbeResult = {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
  if (result.error !== undefined) {
    probe.error = result.error as NodeJS.ErrnoException;
  }
  return probe;
}

async function defaultSleep(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function firstLine(value: string): string | null {
  const line = value.trim().split(/\r?\n/u)[0];
  return line === undefined || line.length === 0 ? null : line;
}

function launchDockerDesktop(
  platform: NodeJS.Platform,
  runLaunch: DockerLaunchRunner,
): { ok: true } | { ok: false; detail: string } {
  if (platform !== "darwin") {
    return {
      ok: false,
      detail: "Docker auto-start is currently supported only for Docker Desktop on macOS.",
    };
  }

  const result = runLaunch("open", ["-a", "Docker"]);
  if (result.error !== undefined) {
    return {
      ok: false,
      detail: `failed to launch Docker Desktop: ${result.error.message}`,
    };
  }
  if (result.status !== 0) {
    const status = result.status === null ? "unknown" : String(result.status);
    const stderr = firstLine(result.stderr);
    return {
      ok: false,
      detail: `open -a Docker exited with status ${status}${stderr === null ? "" : `: ${stderr}`}`,
    };
  }

  return { ok: true };
}

export async function ensureDockerAvailability(
  options: DockerAutostartOptions = {},
): Promise<DockerAvailability> {
  const runProbe = options.runProbe ?? defaultCommandRunner;
  const first = checkDockerAvailability(runProbe);
  if (first.ok) {
    return first;
  }

  const launch = launchDockerDesktop(
    options.platform ?? process.platform,
    options.runLaunch ?? defaultCommandRunner,
  );
  if (!launch.ok) {
    return {
      ok: false,
      detail: `${first.detail} Auto-start failed: ${launch.detail}`,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = Math.max(1, options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
  const attempts = Math.max(1, Math.ceil(timeoutMs / pollIntervalMs));
  const sleep = options.sleep ?? defaultSleep;
  let last = first;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) {
      await sleep(pollIntervalMs);
    }
    const availability = checkDockerAvailability(runProbe);
    if (availability.ok) {
      return availability;
    }
    last = availability;
  }

  return {
    ok: false,
    detail:
      `Docker daemon did not become available within ${String(timeoutMs)}ms ` +
      `after launching Docker Desktop. Last preflight: ${last.detail}`,
  };
}
