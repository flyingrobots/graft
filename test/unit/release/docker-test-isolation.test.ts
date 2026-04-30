import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../../../package.json";

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
    const runner = readRepoFile("scripts/run-isolated-tests.ts");

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
});
