import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeProcessRunner } from "../../../src/adapters/node-process-runner.js";
import { structuralTestCoverageMap } from "../../../src/operations/structural-test-coverage-map.js";
import type { ProcessRunRequest, ProcessRunResult, ProcessRunner } from "../../../src/ports/process-runner.js";
import { cleanupTestRepo, createTestRepo, git, testGitClient } from "../../helpers/git.js";
import { realFs } from "../../helpers/real-fs.js";

class RecordingReferenceSearchRunner implements ProcessRunner {
  readonly requests: ProcessRunRequest[] = [];

  constructor(private readonly stdoutLines: readonly string[] = [
    "test/api.test.ts:1:10:import { coveredApi } from \"../src/api\";",
    "test/api.test.ts:4:10:  expect(coveredApi()).toBe(\"covered\");",
  ]) {}

  run(request: ProcessRunRequest): ProcessRunResult {
    this.requests.push(request);
    return {
      status: 0,
      stdout: this.stdoutLines.join("\n"),
      stderr: "",
    };
  }
}

function writeCoverageScenario(repoDir: string): void {
  fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
  fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "src", "api.ts"), [
    "export function coveredApi(): string {",
    "  return \"covered\";",
    "}",
    "",
    "export function uncoveredApi(): string {",
    "  return \"uncovered\";",
    "}",
    "",
    "function privateHelper(): string {",
    "  return coveredApi();",
    "}",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(repoDir, "test", "api.test.ts"), [
    "import { coveredApi } from \"../src/api\";",
    "",
    "it(\"covers the public API structurally\", () => {",
    "  expect(coveredApi()).toBe(\"covered\");",
    "});",
    "",
  ].join("\n"));
  git(repoDir, "add -A");
  git(repoDir, "commit -m coverage-scenario");
}

describe("operations: structural test coverage map", () => {
  it("reports exported symbols with and without structural test references", async () => {
    const repoDir = createTestRepo("graft-test-coverage-map-");
    try {
      writeCoverageScenario(repoDir);

      const result = await structuralTestCoverageMap({
        cwd: repoDir,
        fs: realFs,
        git: testGitClient,
        process: nodeProcessRunner,
        resolveWorkingTreePath: (filePath) => path.join(repoDir, filePath),
        sourcePath: "src",
        testPath: "test",
      });

      expect(result.coverageKind).toBe("structural_reference");
      expect(result.summary).toContain("1 covered, 1 uncovered");
      expect(result.limitations.join("\n")).toContain("not execution coverage");
      expect(result.totals).toEqual({
        sourceFiles: 1,
        testFiles: 1,
        exportedSymbols: 2,
        coveredSymbols: 1,
        uncoveredSymbols: 1,
      });

      const file = result.files.find((entry) => entry.path === "src/api.ts");
      expect(file).toBeDefined();
      expect(file!.symbols.map((symbol) => symbol.name)).toEqual(["coveredApi", "uncoveredApi"]);
      expect(file!.symbols).toEqual([
        expect.objectContaining({
          name: "coveredApi",
          status: "covered",
          referenceCount: 2,
          referencingTestFiles: ["test/api.test.ts"],
        }),
        expect.objectContaining({
          name: "uncoveredApi",
          status: "uncovered",
          referenceCount: 0,
          referencingTestFiles: [],
        }),
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("skips tracked test files deleted from the working tree before reference search", async () => {
    const repoDir = createTestRepo("graft-test-coverage-map-deleted-test-");
    try {
      writeCoverageScenario(repoDir);
      fs.rmSync(path.join(repoDir, "test", "api.test.ts"));

      const result = await structuralTestCoverageMap({
        cwd: repoDir,
        fs: realFs,
        git: testGitClient,
        process: nodeProcessRunner,
        resolveWorkingTreePath: (filePath) => path.join(repoDir, filePath),
        sourcePath: "src",
        testPath: "test",
      });

      expect(result.totals).toEqual({
        sourceFiles: 1,
        testFiles: 0,
        exportedSymbols: 2,
        coveredSymbols: 0,
        uncoveredSymbols: 2,
      });
      expect(result.files[0]!.symbols).toEqual([
        expect.objectContaining({
          name: "coveredApi",
          status: "uncovered",
          referenceCount: 0,
          referencingTestFiles: [],
        }),
        expect.objectContaining({
          name: "uncoveredApi",
          status: "uncovered",
          referenceCount: 0,
          referencingTestFiles: [],
        }),
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("batches structural reference searches across exported symbols", async () => {
    const repoDir = createTestRepo("graft-test-coverage-map-batched-search-");
    try {
      writeCoverageScenario(repoDir);
      const process = new RecordingReferenceSearchRunner();

      const result = await structuralTestCoverageMap({
        cwd: repoDir,
        fs: realFs,
        git: testGitClient,
        process,
        resolveWorkingTreePath: (filePath) => path.join(repoDir, filePath),
        sourcePath: "src",
        testPath: "test",
      });

      expect(process.requests).toHaveLength(1);
      expect(process.requests[0]).toMatchObject({
        command: "rg",
        cwd: repoDir,
      });
      expect(process.requests[0]!.args).toEqual(expect.arrayContaining([
        "-e",
        "coveredApi",
        "-e",
        "uncoveredApi",
        "--",
        "test/api.test.ts",
      ]));
      expect(result.totals).toEqual({
        sourceFiles: 1,
        testFiles: 1,
        exportedSymbols: 2,
        coveredSymbols: 1,
        uncoveredSymbols: 1,
      });
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("does not mark substring symbol names as covered", async () => {
    const repoDir = createTestRepo("graft-test-coverage-map-substring-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "src", "foo.ts"), [
        "export function foo(): string {",
        "  return \"foo\";",
        "}",
      ].join("\n"));
      fs.writeFileSync(path.join(repoDir, "src", "foobar.ts"), [
        "export function foobar(): string {",
        "  return \"foobar\";",
        "}",
      ].join("\n"));
      fs.writeFileSync(path.join(repoDir, "test", "foobar.test.ts"), [
        "import { foobar } from \"../src/foobar\";",
        "",
        "it(\"covers foobar only\", () => {",
        "  expect(foobar()).toBe(\"foobar\");",
        "});",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m substring-scenario");

      const process = new RecordingReferenceSearchRunner([
        "test/foobar.test.ts:1:10:import { foobar } from \"../src/foobar\";",
        "test/foobar.test.ts:4:10:  expect(foobar()).toBe(\"foobar\");",
      ]);

      const result = await structuralTestCoverageMap({
        cwd: repoDir,
        fs: realFs,
        git: testGitClient,
        process,
        resolveWorkingTreePath: (filePath) => path.join(repoDir, filePath),
        sourcePath: "src",
        testPath: "test",
      });

      expect(process.requests).toHaveLength(1);
      expect(result.totals).toEqual({
        sourceFiles: 2,
        testFiles: 1,
        exportedSymbols: 2,
        coveredSymbols: 1,
        uncoveredSymbols: 1,
      });
      expect(result.files.find((file) => file.path === "src/foo.ts")?.symbols).toEqual([
        expect.objectContaining({
          name: "foo",
          status: "uncovered",
          referenceCount: 0,
        }),
      ]);
      expect(result.files.find((file) => file.path === "src/foobar.ts")?.symbols).toEqual([
        expect.objectContaining({
          name: "foobar",
          status: "covered",
          referenceCount: 2,
          referencingTestFiles: ["test/foobar.test.ts"],
        }),
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("keeps same-named exports attributed to the referenced source file", async () => {
    const repoDir = createTestRepo("graft-test-coverage-map-same-name-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "src", "a.ts"), [
        "export function sharedApi(): string {",
        "  return \"a\";",
        "}",
      ].join("\n"));
      fs.writeFileSync(path.join(repoDir, "src", "b.ts"), [
        "export function sharedApi(): string {",
        "  return \"b\";",
        "}",
      ].join("\n"));
      fs.writeFileSync(path.join(repoDir, "test", "a.test.ts"), [
        "import { sharedApi } from \"../src/a\";",
        "",
        "it(\"covers the a implementation\", () => {",
        "  expect(sharedApi()).toBe(\"a\");",
        "});",
      ].join("\n"));
      git(repoDir, "add -A");
      git(repoDir, "commit -m same-name-scenario");

      const process = new RecordingReferenceSearchRunner([
        "test/a.test.ts:1:10:import { sharedApi } from \"../src/a\";",
        "test/a.test.ts:4:10:  expect(sharedApi()).toBe(\"a\");",
      ]);

      const result = await structuralTestCoverageMap({
        cwd: repoDir,
        fs: realFs,
        git: testGitClient,
        process,
        resolveWorkingTreePath: (filePath) => path.join(repoDir, filePath),
        sourcePath: "src",
        testPath: "test",
      });

      expect(process.requests).toHaveLength(1);
      expect(result.totals).toEqual({
        sourceFiles: 2,
        testFiles: 1,
        exportedSymbols: 2,
        coveredSymbols: 1,
        uncoveredSymbols: 1,
      });
      expect(result.files.find((file) => file.path === "src/a.ts")?.symbols).toEqual([
        expect.objectContaining({
          name: "sharedApi",
          status: "covered",
          referenceCount: 1,
          referencingTestFiles: ["test/a.test.ts"],
        }),
      ]);
      expect(result.files.find((file) => file.path === "src/b.ts")?.symbols).toEqual([
        expect.objectContaining({
          name: "sharedApi",
          status: "uncovered",
          referenceCount: 0,
          referencingTestFiles: [],
        }),
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
