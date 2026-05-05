import { describe, expect, it } from "vitest";
import {
  ensureDockerAvailability,
  type DockerLaunchRunner,
} from "../../../scripts/docker-autostart.js";
import type { DockerProbeResult, DockerProbeRunner } from "../../../scripts/docker-availability.js";

function result(fields: Partial<DockerProbeResult>): DockerProbeResult {
  return {
    status: fields.status ?? 0,
    signal: fields.signal ?? null,
    stdout: fields.stdout ?? "",
    stderr: fields.stderr ?? "",
    ...(fields.error !== undefined ? { error: fields.error } : {}),
  };
}

function noSleep(): void {
  return undefined;
}

describe("docker autostart helper", () => {
  it("does not launch Docker when the daemon is already available", () => {
    const launchCalls: string[] = [];

    const availability = ensureDockerAvailability({
      runProbe: () => result({ stdout: "\"25.0.0\"\n" }),
      runLaunch: (command, args) => {
        launchCalls.push([command, ...args].join(" "));
        return result({});
      },
      platform: "darwin",
    });

    expect(availability).toEqual({ ok: true });
    expect(launchCalls).toEqual([]);
  });

  it("launches Docker Desktop on macOS and polls until Docker becomes available", () => {
    const probeCalls: string[] = [];
    const launchCalls: string[] = [];
    let probeCount = 0;
    const runProbe: DockerProbeRunner = (command, args) => {
      probeCalls.push([command, ...args].join(" "));
      probeCount++;
      return probeCount >= 3
        ? result({ stdout: "\"25.0.0\"\n" })
        : result({
          status: 1,
          stderr: "Cannot connect to the Docker daemon.",
        });
    };
    const runLaunch: DockerLaunchRunner = (command, args) => {
      launchCalls.push([command, ...args].join(" "));
      return result({});
    };

    const availability = ensureDockerAvailability({
      runProbe,
      runLaunch,
      platform: "darwin",
      pollIntervalMs: 1,
      timeoutMs: 5,
      sleep: noSleep,
    });

    expect(availability).toEqual({ ok: true });
    expect(launchCalls).toEqual(["open -a Docker"]);
    expect(probeCalls).toEqual([
      "docker info --format {{json .ServerVersion}}",
      "docker info --format {{json .ServerVersion}}",
      "docker info --format {{json .ServerVersion}}",
    ]);
  });

  it("reports unsupported auto-start platforms without hiding the original preflight", () => {
    const availability = ensureDockerAvailability({
      runProbe: () => result({
        status: 1,
        stderr: "Cannot connect to the Docker daemon.",
      }),
      runLaunch: () => result({}),
      platform: "linux",
      sleep: noSleep,
    });

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(availability.detail).toContain("Cannot connect to the Docker daemon.");
      expect(availability.detail).toContain("supported only for Docker Desktop on macOS");
    }
  });

  it("reports Docker Desktop launch failures", () => {
    const availability = ensureDockerAvailability({
      runProbe: () => result({
        status: 1,
        stderr: "Cannot connect to the Docker daemon.",
      }),
      runLaunch: () => result({
        status: 1,
        stderr: "Unable to find application named Docker",
      }),
      platform: "darwin",
      sleep: noSleep,
    });

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(availability.detail).toContain("open -a Docker exited with status 1");
      expect(availability.detail).toContain("Unable to find application named Docker");
    }
  });

  it("times out with the last Docker preflight detail after launching", () => {
    const availability = ensureDockerAvailability({
      runProbe: () => result({
        status: 1,
        stderr: "Docker is still starting.",
      }),
      runLaunch: () => result({}),
      platform: "darwin",
      pollIntervalMs: 1,
      timeoutMs: 2,
      sleep: noSleep,
    });

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(availability.detail).toContain("did not become available within 2ms");
      expect(availability.detail).toContain("Last preflight: Docker is still starting.");
    }
  });
});
