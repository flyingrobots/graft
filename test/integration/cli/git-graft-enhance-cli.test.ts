import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { runCli } from "../../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createBufferWriter } from "../../helpers/init.js";

function writeScenario(repoDir: string): void {
  fs.writeFileSync(path.join(repoDir, "api.ts"), [
    "export function greet(name: string): string {",
    "  return `hello ${name}`;",
    "}",
    "",
  ].join("\n"));
  git(repoDir, "add -A");
  git(repoDir, "commit -m baseline");

  fs.writeFileSync(path.join(repoDir, "api.ts"), [
    "export function greet(name: string, title?: string): string {",
    "  return `hello ${title ?? name}`;",
    "}",
    "",
    "export function wave(): string {",
    "  return \"wave\";",
    "}",
    "",
  ].join("\n"));
  git(repoDir, "add -A");
  git(repoDir, "commit -m enhance-target");
}

function scrubbedEnvWithPath(binDir: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${binDir}${path.delimiter}${process.env["PATH"] ?? ""}`,
  };
  delete env["GIT_DIR"];
  delete env["GIT_WORK_TREE"];
  delete env["GIT_WARP_HOME"];
  return env;
}

describe("cli: git graft enhance integration", { timeout: 30_000 }, () => {
  it("renders a human review summary for enhance --since in a temp repo", async () => {
    const repoDir = createTestRepo("graft-enhance-cli-");
    try {
      writeScenario(repoDir);

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();
      await runCli({
        cwd: repoDir,
        args: ["enhance", "--since", "HEAD~1"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      expect(stdout.text()).toContain("Git Graft Enhance");
      expect(stdout.text()).toContain("range: HEAD~1..HEAD");
      expect(stdout.text()).toContain("files: 1");
      expect(stdout.text()).toContain("symbols: +1 -0 ~1");
      expect(stdout.text()).toContain("semver impact: minor");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("emits schema-validated JSON for enhance --since in a temp repo", async () => {
    const repoDir = createTestRepo("graft-enhance-json-");
    try {
      writeScenario(repoDir);

      const stdout = createBufferWriter();
      const stderr = createBufferWriter();
      await runCli({
        cwd: repoDir,
        args: ["enhance", "--since", "HEAD~1", "--json"],
        stdout,
        stderr,
      });

      expect(stderr.text()).toBe("");
      const parsed = JSON.parse(stdout.text()) as {
        _schema: { id: string };
        range: { since: string; head: string };
        structural: { changedFiles: number; addedSymbols: number; changedSymbols: number };
        exports: { semverImpact: string; changed: boolean };
      };
      expect(parsed._schema.id).toBe("graft.cli.git_graft_enhance");
      expect(parsed.range).toEqual({ since: "HEAD~1", head: "HEAD" });
      expect(parsed.structural).toMatchObject({ changedFiles: 1, addedSymbols: 1, changedSymbols: 1 });
      expect(parsed.exports).toMatchObject({ changed: true, semverImpact: "minor" });
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("supports Git external-command invocation through git graft in a temp repo", () => {
    const repoDir = createTestRepo("graft-enhance-git-external-");
    const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-enhance-bin-"));
    try {
      writeScenario(repoDir);
      fs.symlinkSync(path.resolve(import.meta.dirname, "../../../bin/graft.js"), path.join(binDir, "git-graft"));

      const output = execFileSync("git", ["graft", "enhance", "--since", "HEAD~1"], {
        cwd: repoDir,
        env: scrubbedEnvWithPath(binDir),
        encoding: "utf8",
      });

      expect(output).toContain("Git Graft Enhance");
      expect(output).toContain("range: HEAD~1..HEAD");
    } finally {
      cleanupTestRepo(repoDir);
      fs.rmSync(binDir, { recursive: true, force: true });
    }
  });
});
