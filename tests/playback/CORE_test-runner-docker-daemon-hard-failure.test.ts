import { describe, expect, it } from "vitest";
import {
  checkDockerAvailability,
  formatDockerUnavailableMessage,
} from "../../scripts/docker-availability.js";

describe("CORE_test-runner-docker-daemon-hard-failure", () => {
  it("Can I tell immediately that the failure is Docker availability, not a Vitest failure?", () => {
    const availability = checkDockerAvailability(() => ({
      status: 1,
      signal: null,
      stdout: "",
      stderr: "ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.",
    }));

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      const message = formatDockerUnavailableMessage(availability);
      expect(message.split("\n")[0]).toBe(
        "Cannot run isolated test suite because Docker is unavailable.",
      );
      expect(message).not.toContain("Vitest");
    }
  });

  it("Does the failure message name `pnpm test:local` as the non-isolated local feedback fallback?", () => {
    const availability = checkDockerAvailability(() => ({
      status: 1,
      signal: null,
      stdout: "",
      stderr: "ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.",
    }));

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(formatDockerUnavailableMessage(availability)).toContain(
        "Use `pnpm test:local` for non-isolated local feedback while Docker is unavailable.",
      );
    }
  });

  it("Does the message preserve that release-grade `pnpm test` still requires Docker isolation?", () => {
    const availability = checkDockerAvailability(() => ({
      status: 1,
      signal: null,
      stdout: "",
      stderr: "ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.",
    }));

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(formatDockerUnavailableMessage(availability)).toContain(
        "`pnpm test` is the release-grade isolated runner and still requires Docker.",
      );
    }
  });

  it("Does `pnpm test` detect unavailable Docker before invoking `docker build`?", () => {
    const calls: string[] = [];
    const availability = checkDockerAvailability((command, args) => {
      calls.push([command, ...args].join(" "));
      return {
        status: 1,
        signal: null,
        stdout: "",
        stderr: "ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.",
      };
    });

    expect(calls).toEqual(["docker info --format {{json .ServerVersion}}"]);
    expect(availability.ok).toBe(false);
  });

  it("Is the Docker preflight formatting deterministic and testable without a live Docker daemon?", () => {
    const availability = checkDockerAvailability(() => ({
      status: 1,
      signal: null,
      stdout: "",
      stderr: "ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.\n",
    }));

    expect(availability.ok).toBe(false);
    if (!availability.ok) {
      expect(formatDockerUnavailableMessage(availability)).toBe([
        "Cannot run isolated test suite because Docker is unavailable.",
        "Docker preflight: ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock.",
        "`pnpm test` is the release-grade isolated runner and still requires Docker.",
        "Use `pnpm test:local` for non-isolated local feedback while Docker is unavailable.",
      ].join("\n"));
    }
  });

  it("Does the release/check path keep using the isolated runner rather than silently falling back to host-side Vitest?", () => {
    const availability = checkDockerAvailability(() => ({
      status: 0,
      signal: null,
      stdout: "\"24.0.0\"\n",
      stderr: "",
    }));

    expect(availability.ok).toBe(true);
  });
});
