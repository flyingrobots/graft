import { spawnSync } from "node:child_process";

export interface DockerProbeResult {
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: NodeJS.ErrnoException;
}

export type DockerProbeRunner = (command: string, args: readonly string[]) => DockerProbeResult;

export type DockerAvailability =
  | { ok: true }
  | { ok: false; detail: string };

const DOCKER_INFO_ARGS = ["info", "--format", "{{json .ServerVersion}}"] as const;

function defaultDockerProbe(command: string, args: readonly string[]): DockerProbeResult {
  const result = spawnSync(command, [...args], {
    encoding: "utf8",
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

function firstLine(value: string): string | null {
  const line = value.trim().split(/\r?\n/u)[0];
  return line === undefined || line.length === 0 ? null : line;
}

export function checkDockerAvailability(
  run: DockerProbeRunner = defaultDockerProbe,
): DockerAvailability {
  const result = run("docker", DOCKER_INFO_ARGS);
  if (result.error !== undefined) {
    if (result.error.code === "ENOENT") {
      return { ok: false, detail: "Docker CLI was not found on PATH." };
    }
    return {
      ok: false,
      detail: `Docker preflight command failed to start: ${result.error.message}`,
    };
  }
  if (result.status === 0) {
    return { ok: true };
  }
  const stderr = firstLine(result.stderr);
  if (stderr !== null) {
    return { ok: false, detail: stderr };
  }
  const status = result.status === null ? "unknown" : String(result.status);
  return { ok: false, detail: `docker info exited with status ${status}` };
}

export function formatDockerUnavailableMessage(
  availability: Exclude<DockerAvailability, { ok: true }>,
): string {
  return [
    "Cannot run isolated test suite because Docker is unavailable.",
    `Docker preflight: ${availability.detail}`,
    "`pnpm test` is the release-grade isolated runner and still requires Docker.",
    "Use `pnpm test:local` for non-isolated local feedback while Docker is unavailable.",
  ].join("\n");
}
