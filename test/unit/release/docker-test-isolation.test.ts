import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
import { ensureDockerAvailability } from "../../../scripts/docker-autostart.js";
import { formatDockerUnavailableMessage } from "../../../scripts/docker-availability.js";
import { runIsolatedTests, type RunnerSpawn } from "../../../scripts/isolated-test-runner.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function dockerignoreLines(): string[] {
  return readRepoFile(".dockerignore")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

describe("Docker-isolated test validation", () => {
  it("routes the default test command through the Docker isolation harness", () => {
    expect(packageJson.scripts.test).toBe("tsx scripts/run-isolated-tests.ts");
    expect("test:local" in packageJson.scripts).toBe(false);
    expect("test:watch" in packageJson.scripts).toBe(false);
    expect(packageJson.scripts["release:surface-gate"]).not.toContain("vitest");
    expect(packageJson.scripts["release:surface-gate"]).toContain("pnpm test");
  });

  it("keeps the live git checkout out of the Docker test context", () => {
    const ignored = dockerignoreLines();
    expect(ignored).toContain(".git");
    expect(ignored).toContain(".graft");
    expect(ignored).not.toContain("test");
    expect(ignored).not.toContain("tests");
    expect(ignored).not.toContain("docs");
    expect(ignored).not.toContain("*.md");
  });

  it("builds a copy-in test stage instead of bind-mounting the live checkout", () => {
    const dockerfile = readRepoFile("Dockerfile");
    const runner = readRepoFile("scripts/isolated-test-runner.ts");

    expect(dockerfile).toContain("FROM deps AS source");
    expect(dockerfile).toContain(
      "RUN --network=none sh scripts/strip-copied-git-remotes.sh /app",
    );
    expect(dockerfile).toContain("FROM source AS build");
    expect(dockerfile).toContain("RUN --network=none pnpm build");
    expect(dockerfile).toContain("FROM build AS test");
    expect(dockerfile).toContain("COPY . .");
    expect(dockerfile).toContain("ENV NO_COLOR=1");
    expect(runner).toContain("\"--target\", \"test\"");
    expect(runner).toContain("\"--network\"");
    expect(runner).toContain("\"none\"");
    expect(runner).not.toContain("--volume");
    expect(runner).not.toContain("\"-v\"");
    expect(runner).not.toContain("GRAFT_TEST_CONTAINER");
  });

  it("pins the Docker test base image to an immutable digest", () => {
    const dockerfile = readRepoFile("Dockerfile");
    const [baseImage] = dockerfile.split(/\r?\n/u);

    expect(baseImage).toMatch(
      /^FROM node:22-alpine@sha256:[0-9a-f]{64} AS deps$/u,
    );
    expect(dockerfile).toContain("RUN apk add --no-cache git=2.54.0-r0");
  });

  it("preflights Docker availability before building the isolated image", async () => {
    const calls: string[] = [];
    const exits: number[] = [];
    const spawn: RunnerSpawn = (command, args) => {
      calls.push([command, ...args].join(" "));
      return { status: 0 };
    };
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    await expect(runIsolatedTests({
      argv: [],
      env: {},
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: (message) => {
        throw new Error(`unexpected stderr: ${message}`);
      },
      createImageReference: () => "graft-test:local",
      exit,
      spawn,
    })).rejects.toThrow("exit 0");

    expect(calls).toEqual([
      "docker preflight",
      "docker build --target test -t graft-test:local .",
      [
        "docker run --rm --network none --cap-drop ALL",
        "--security-opt no-new-privileges --",
        "graft-test:local pnpm exec vitest run --maxWorkers 2",
      ].join(" "),
      "docker image rm graft-test:local",
    ]);
    expect(exits).toEqual([0]);
  });

  it("retries the Docker image build before running isolated tests", async () => {
    const calls: string[] = [];
    const exits: number[] = [];
    let buildAttempts = 0;
    const spawn: RunnerSpawn = (command, args) => {
      calls.push([command, ...args].join(" "));
      if (args[0] === "build") {
        buildAttempts += 1;
        return { status: buildAttempts === 1 ? 1 : 0 };
      }
      return { status: 0 };
    };
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    await expect(runIsolatedTests({
      argv: [],
      env: {
        GRAFT_TEST_DOCKER_BUILD_RETRIES: "2",
        GRAFT_TEST_DOCKER_BUILD_RETRY_DELAY_MS: "0",
      },
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: () => undefined,
      createImageReference: () => "graft-test:local",
      exit,
      spawn,
    })).rejects.toThrow("exit 0");

    expect(calls).toEqual([
      "docker preflight",
      "docker build --target test -t graft-test:local .",
      "docker build --target test -t graft-test:local .",
      [
        "docker run --rm --network none --cap-drop ALL",
        "--security-opt no-new-privileges --",
        "graft-test:local pnpm exec vitest run --maxWorkers 2",
      ].join(" "),
      "docker image rm graft-test:local",
    ]);
    expect(exits).toEqual([0]);
  });

  it("stops after bounded Docker image build retries", async () => {
    const calls: string[] = [];
    const exits: number[] = [];
    const spawn: RunnerSpawn = (command, args) => {
      calls.push([command, ...args].join(" "));
      return { status: args[0] === "build" ? 1 : 0 };
    };
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    await expect(runIsolatedTests({
      argv: [],
      env: {
        GRAFT_TEST_DOCKER_BUILD_RETRIES: "2",
        GRAFT_TEST_DOCKER_BUILD_RETRY_DELAY_MS: "0",
      },
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: () => undefined,
      createImageReference: () => "graft-test:local",
      exit,
      spawn,
    })).rejects.toThrow("exit 1");

    expect(calls).toEqual([
      "docker preflight",
      "docker build --target test -t graft-test:local .",
      "docker build --target test -t graft-test:local .",
      "docker build --target test -t graft-test:local .",
    ]);
    expect(exits).toEqual([1]);
  });

  it("does not retry isolated test execution after the image build succeeds", async () => {
    const calls: string[] = [];
    const exits: number[] = [];
    const spawn: RunnerSpawn = (command, args) => {
      calls.push([command, ...args].join(" "));
      return { status: args[0] === "run" ? 1 : 0 };
    };
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    await expect(runIsolatedTests({
      argv: [],
      env: {
        GRAFT_TEST_DOCKER_BUILD_RETRIES: "2",
        GRAFT_TEST_DOCKER_BUILD_RETRY_DELAY_MS: "0",
      },
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: () => undefined,
      createImageReference: () => "graft-test:local",
      exit,
      spawn,
    })).rejects.toThrow("exit 1");

    expect(calls).toEqual([
      "docker preflight",
      "docker build --target test -t graft-test:local .",
      [
        "docker run --rm --network none --cap-drop ALL",
        "--security-opt no-new-privileges --",
        "graft-test:local pnpm exec vitest run --maxWorkers 2",
      ].join(" "),
      "docker image rm graft-test:local",
    ]);
    expect(exits).toEqual([1]);
  });

  it("rejects option-shaped Docker image references before invoking Docker", async () => {
    const calls: string[] = [];
    const errors: string[] = [];
    const exits: number[] = [];
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    await expect(runIsolatedTests({
      argv: [],
      env: { GRAFT_TEST_IMAGE: "--volume=/host/checkout:/app" },
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: (message) => {
        errors.push(message);
      },
      exit,
      spawn: (command, args) => {
        calls.push([command, ...args].join(" "));
        return { status: 0 };
      },
    })).rejects.toThrow("exit 1");

    expect(calls).toEqual([]);
    expect(errors).toEqual([
      "Invalid GRAFT_TEST_IMAGE: use a non-empty tag prefix without whitespace, '@', or a leading '-'.",
    ]);
    expect(exits).toEqual([1]);
  });

  it("offers no host fallback and launches Docker Desktop through the exported behavior", async () => {
    const message = formatDockerUnavailableMessage({
      ok: false,
      detail: "daemon not running",
    });
    expect(message).toContain("Docker is unavailable");
    expect(message).toContain("All Graft tests require the copy-in Docker runner");
    expect(message).not.toContain("test:local");

    const launchCalls: string[] = [];
    let probeCount = 0;
    const availability = await ensureDockerAvailability({
      runProbe: () => {
        probeCount++;
        return probeCount === 1
          ? { status: 1, signal: null, stdout: "", stderr: "daemon not running" }
          : { status: 0, signal: null, stdout: "\"25.0.0\"", stderr: "" };
      },
      runLaunch: (command, args) => {
        launchCalls.push([command, ...args].join(" "));
        return { status: 0, signal: null, stdout: "", stderr: "" };
      },
      platform: "darwin",
      pollIntervalMs: 1,
      timeoutMs: 1,
      sleep: () => undefined,
    });

    expect(availability).toEqual({ ok: true });
    expect(launchCalls).toEqual(["open -a Docker"]);
  });

  it("does not let a host environment variable bypass Docker isolation", async () => {
    const calls: string[] = [];
    const exits: number[] = [];
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    await expect(runIsolatedTests({
      argv: [],
      env: { GRAFT_TEST_CONTAINER: "1" },
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: (message) => { throw new Error(`unexpected stderr: ${message}`); },
      createImageReference: () => "graft-test:local",
      exit,
      spawn: (command, args) => {
        calls.push([command, ...args].join(" "));
        return { status: 0 };
      },
    })).rejects.toThrow("exit 0");

    expect(calls).toEqual([
      "docker preflight",
      "docker build --target test -t graft-test:local .",
      [
        "docker run --rm --network none --cap-drop ALL",
        "--security-opt no-new-privileges --",
        "graft-test:local pnpm exec vitest run --maxWorkers 2",
      ].join(" "),
      "docker image rm graft-test:local",
    ]);
    expect(exits).toEqual([0]);
  });

  it("uses a distinct image reference for each isolated test invocation", async () => {
    async function captureImageReference(): Promise<string> {
      const calls: { command: string; args: string[] }[] = [];
      const exit = (code = 0): never => {
        throw new Error(`exit ${String(code)}`);
      };

      await expect(runIsolatedTests({
        argv: [],
        env: {},
        checkDocker: () => ({ ok: true }),
        error: (message) => { throw new Error(`unexpected stderr: ${message}`); },
        exit,
        spawn: (command, args) => {
          calls.push({ command, args: [...args] });
          return { status: 0 };
        },
      })).rejects.toThrow("exit 0");

      const build = calls.find((call) => call.command === "docker" && call.args[0] === "build");
      const run = calls.find((call) => call.command === "docker" && call.args[0] === "run");
      const cleanup = calls.find((call) => call.command === "docker" && call.args[0] === "image");
      const image = build?.args[4];
      expect(image).toBeDefined();
      expect(run?.args).toContain(image);
      expect(cleanup?.args).toEqual(["image", "rm", image]);
      return image!;
    }

    const first = await captureImageReference();
    const second = await captureImageReference();

    expect(first).not.toBe(second);
  });
});
