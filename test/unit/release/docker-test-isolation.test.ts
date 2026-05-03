import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";
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

function missingExecutable(command: string): NodeJS.ErrnoException {
  const error = new Error(`spawn ${command} ENOENT`) as NodeJS.ErrnoException;
  error.code = "ENOENT";
  return error;
}

describe("Docker-isolated test validation", () => {
  it("routes the default test command through the Docker isolation harness", () => {
    expect(packageJson.scripts.test).toBe("tsx scripts/run-isolated-tests.ts");
    expect(packageJson.scripts["test:local"]).toBe("vitest run");
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

    expect(dockerfile).toContain("FROM deps AS build");
    expect(dockerfile).toContain("RUN pnpm build");
    expect(dockerfile).toContain("FROM build AS test");
    expect(dockerfile).toContain("COPY . .");
    expect(dockerfile).toContain("ENV GRAFT_TEST_CONTAINER=1");
    expect(dockerfile).toContain("ENV NO_COLOR=1");
    expect(runner).toContain("\"--target\", \"test\"");
    expect(runner).toContain("\"--network\"");
    expect(runner).toContain("\"none\"");
    expect(runner).not.toContain("--volume");
    expect(runner).not.toContain("\"-v\"");
  });

  it("preflights Docker availability before building the isolated image", () => {
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

    expect(() => runIsolatedTests({
      argv: [],
      env: {},
      checkDocker: () => {
        calls.push("docker preflight");
        return { ok: true };
      },
      error: (message) => {
        throw new Error(`unexpected stderr: ${message}`);
      },
      exit,
      spawn,
    })).toThrow("exit 0");

    expect(calls).toEqual([
      "docker preflight",
      "docker build --target test -t graft-test:local .",
      [
        "docker run --rm --network none",
        "-e GRAFT_TEST_CONTAINER=1",
        "graft-test:local pnpm exec vitest run",
      ].join(" "),
    ]);
    expect(exits).toEqual([0]);
  });

  it("names the host-side local fallback without weakening isolated validation", () => {
    const preflight = readRepoFile("scripts/docker-availability.ts");

    expect(preflight).toContain("Docker is unavailable");
    expect(preflight).toContain("`pnpm test` is the release-grade isolated runner");
    expect(preflight).toContain("`pnpm test:local`");
  });

  it("does not print Docker guidance when pnpm is missing inside the isolated runner", () => {
    const errors: string[] = [];
    const exits: number[] = [];
    const exit = (code = 0): never => {
      exits.push(code);
      throw new Error(`exit ${String(code)}`);
    };

    expect(() => runIsolatedTests({
      argv: [],
      env: { GRAFT_TEST_CONTAINER: "1" },
      checkDocker: () => ({ ok: true }),
      error: (message) => {
        errors.push(message);
      },
      exit,
      spawn: () => ({
        status: null,
        error: missingExecutable("pnpm"),
      }),
    })).toThrow("exit 1");

    expect(errors).toEqual([
      "Failed to run pnpm: spawn pnpm ENOENT",
      "Executable `pnpm` was not found on PATH. Install it or fix PATH.",
    ]);
    expect(errors.join("\n")).not.toContain("Docker is required");
    expect(exits).toEqual([1]);
  });
});
