import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runCli } from "../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";
import { createBufferWriter } from "../../test/helpers/init.js";

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
  ].join("\n"));
  fs.writeFileSync(path.join(repoDir, "test", "api.test.ts"), [
    "import { coveredApi } from \"../src/api\";",
    "",
    "it(\"uses the public API\", () => {",
    "  expect(coveredApi()).toBe(\"covered\");",
    "});",
    "",
  ].join("\n"));
  git(repoDir, "add -A");
  git(repoDir, "commit -m coverage-scenario");
}

async function runCoverage(repoDir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({ cwd: repoDir, args, stdout, stderr });
  return { stdout: stdout.text(), stderr: stderr.text() };
}

describe("CORE_structural-test-coverage-map playback", () => {
  it("Can I see which exported symbols have obvious structural test references?", async () => {
    const repoDir = createTestRepo("graft-test-coverage-playback-");
    try {
      writeCoverageScenario(repoDir);

      const result = await runCoverage(repoDir, ["struct", "test-coverage", "--src", "src", "--tests", "test"]);

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Graft Structural Test Coverage");
      expect(result.stdout).toContain("kind: structural_reference");
      expect(result.stdout).toContain("covered: 1");
      expect(result.stdout).toContain("uncovered: 1");
      expect(result.stdout).toContain("not execution coverage");
      expect(result.stdout).toContain("- src/api.ts: coveredApi covered");
      expect(result.stdout).toContain("- src/api.ts: uncoveredApi uncovered");
      expect(result.stdout.trimStart().startsWith("{")).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Can agents request the same structural test-reference facts as schema-validated JSON?", async () => {
    const repoDir = createTestRepo("graft-test-coverage-json-");
    try {
      writeCoverageScenario(repoDir);

      const result = await runCoverage(repoDir, [
        "struct",
        "test-coverage",
        "--src",
        "src",
        "--tests",
        "test",
        "--json",
      ]);

      expect(result.stderr).toBe("");
      const parsed = JSON.parse(result.stdout) as {
        _schema: { id: string };
        coverageKind: string;
        totals: { exportedSymbols: number; coveredSymbols: number; uncoveredSymbols: number };
        files: { path: string; symbols: { name: string; status: string }[] }[];
      };
      expect(parsed._schema.id).toBe("graft.cli.struct_test_coverage");
      expect(parsed.coverageKind).toBe("structural_reference");
      expect(parsed.totals).toMatchObject({ exportedSymbols: 2, coveredSymbols: 1, uncoveredSymbols: 1 });
      expect(parsed.files[0]!.symbols).toEqual([
        expect.objectContaining({ name: "coveredApi", status: "covered" }),
        expect.objectContaining({ name: "uncoveredApi", status: "uncovered" }),
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
