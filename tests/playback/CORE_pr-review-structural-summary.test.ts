import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runCli } from "../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";
import { createBufferWriter } from "../../test/helpers/init.js";

function writeReviewScenario(repoDir: string): void {
  fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "src", "api.ts"), [
    "export function greet(name: string): string {",
    "  return `hello ${name}`;",
    "}",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(repoDir, "src", "format.ts"), [
    "export function stable(): string {",
    "  return \"stable\";",
    "}",
    "",
  ].join("\n"));
  git(repoDir, "add -A");
  git(repoDir, "commit -m baseline");

  fs.writeFileSync(path.join(repoDir, "src", "api.ts"), [
    "export function greet(name: string, title?: string): string {",
    "  return `hello ${title ?? name}`;",
    "}",
    "",
    "export function wave(): string {",
    "  return \"wave\";",
    "}",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(repoDir, "src", "format.ts"), [
    "export function stable(): string {",
    "  // formatting-only review noise",
    "  return \"stable\";",
    "}",
    "",
  ].join("\n"));
  fs.mkdirSync(path.join(repoDir, "test"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "test", "api.test.ts"), "import { greet } from '../src/api';\n");
  fs.writeFileSync(path.join(repoDir, "README.md"), "# Review docs\n");
  git(repoDir, "add -A");
  git(repoDir, "commit -m review-target");
}

async function runReview(repoDir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({
    cwd: repoDir,
    args,
    stdout,
    stderr,
  });
  return { stdout: stdout.text(), stderr: stderr.text() };
}

describe("CORE_pr-review-structural-summary playback", () => {
  it("Can I run graft review over a local PR range and see structural files separated from review noise?", async () => {
    const repoDir = createTestRepo("graft-review-summary-playback-");
    try {
      writeReviewScenario(repoDir);

      const result = await runReview(repoDir, ["review", "--base", "HEAD~1"]);

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Graft Review");
      expect(result.stdout).toContain("range: HEAD~1..HEAD");
      expect(result.stdout).toContain("files: 4");
      expect(result.stdout).toContain("structural: 1");
      expect(result.stdout).toContain("formatting: 1");
      expect(result.stdout).toContain("tests: 1");
      expect(result.stdout).toContain("docs: 1");
      expect(result.stdout).toContain("- src/api.ts: structural");
      expect(result.stdout).toContain("- src/format.ts: formatting");
      expect(result.stdout.trimStart().startsWith("{")).toBe(false);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Can agents request the same graft review facts as schema-validated JSON?", async () => {
    const repoDir = createTestRepo("graft-review-summary-json-");
    try {
      writeReviewScenario(repoDir);

      const result = await runReview(repoDir, ["review", "--base", "HEAD~1", "--json"]);

      expect(result.stderr).toBe("");
      const parsed = JSON.parse(result.stdout) as {
        _schema: { id: string };
        totalFiles: number;
        categories: { structural: number; formatting: number; test: number; docs: number };
        files: { path: string; category: string }[];
      };
      expect(parsed._schema.id).toBe("graft.cli.struct_review");
      expect(parsed.totalFiles).toBe(4);
      expect(parsed.categories).toMatchObject({ structural: 1, formatting: 1, test: 1, docs: 1 });
      expect(parsed.files).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: "src/api.ts", category: "structural" }),
        expect.objectContaining({ path: "src/format.ts", category: "formatting" }),
      ]));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
