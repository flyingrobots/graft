import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { runCli } from "../../src/cli/main.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";
import { createBufferWriter } from "../../test/helpers/init.js";

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

async function runEnhance(repoDir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
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

describe("CORE_git-graft-enhance playback", () => {
  it("Can I run git-graft enhance --since HEAD~1 in a temp repo and see a concise structural review summary?", async () => {
    const repoDir = createTestRepo("graft-enhance-playback-human-");
    try {
      writeScenario(repoDir);

      const result = await runEnhance(repoDir, ["enhance", "--since", "HEAD~1"]);

      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("Git Graft Enhance");
      expect(result.stdout).toContain("range: HEAD~1..HEAD");
      expect(result.stdout).toContain("symbols: +1 -0 ~1");
      expect(result.stdout).toContain("semver impact: minor");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Can I run git-graft enhance --since HEAD~1 --json in a temp repo and get schema-validated JSON for the same facts?", async () => {
    const repoDir = createTestRepo("graft-enhance-playback-json-");
    try {
      writeScenario(repoDir);

      const result = await runEnhance(repoDir, ["enhance", "--since", "HEAD~1", "--json"]);

      expect(result.stderr).toBe("");
      const parsed = JSON.parse(result.stdout) as {
        _schema: { id: string };
        structural: { addedSymbols: number; changedSymbols: number };
        exports: { semverImpact: string };
      };
      expect(parsed._schema.id).toBe("graft.cli.git_graft_enhance");
      expect(parsed.structural).toMatchObject({ addedSymbols: 1, changedSymbols: 1 });
      expect(parsed.exports.semverImpact).toBe("minor");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("Does the documented Git external-command form git graft enhance match the shipped git-graft binary behavior?", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, "../../package.json"), "utf8")) as {
      bin?: Record<string, string>;
    };
    const cliDocs = fs.readFileSync(path.resolve(import.meta.dirname, "../../docs/CLI.md"), "utf8");

    expect(packageJson.bin?.["git-graft"]).toBe("./bin/graft.js");
    expect(cliDocs).toContain("git graft enhance --since");
    expect(cliDocs).toContain("git-graft enhance --since");
  });

  it("Does parseCommand route enhance --since <ref> with optional --head and --json into one CLI command?", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/cli/command-parser.ts"), "utf8");

    expect(source).toContain("parseEnhanceCommand");
    expect(source).toContain("git_graft_enhance");
    expect(source).toContain("--since");
    expect(source).toContain("--head");
  });

  it("Does buildGitGraftEnhanceModel compose graft_since and graft_exports output without calling WARP directly?", () => {
    const modelSource = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/cli/git-graft-enhance-model.ts"), "utf8");
    const commandSource = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/cli/git-graft-enhance.ts"), "utf8");

    expect(modelSource).toContain("buildGitGraftEnhanceModel");
    expect(commandSource).toContain("\"graft_since\"");
    expect(commandSource).toContain("\"graft_exports\"");
    expect(modelSource).not.toContain("warp");
    expect(commandSource).not.toContain("getWarp");
  });

  it("Does renderGitGraftEnhance render deterministically from the model only?", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "../../src/cli/git-graft-enhance-render.ts"), "utf8");

    expect(source).toContain("renderGitGraftEnhance(model");
    expect(source).not.toContain("process.cwd");
    expect(source).not.toContain("createGraftServer");
  });
});
