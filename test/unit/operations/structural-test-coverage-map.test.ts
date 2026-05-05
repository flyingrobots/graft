import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeProcessRunner } from "../../../src/adapters/node-process-runner.js";
import { structuralTestCoverageMap } from "../../../src/operations/structural-test-coverage-map.js";
import { cleanupTestRepo, createTestRepo, git, testGitClient } from "../../helpers/git.js";
import { realFs } from "../../helpers/real-fs.js";

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
});
