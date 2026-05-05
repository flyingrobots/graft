import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodePathOps } from "../../src/adapters/node-paths.js";
import { runCli } from "../../src/cli/main.js";
import { openWarp } from "../../src/warp/open.js";
import { indexHead } from "../../src/warp/index-head.js";
import { cleanupTestRepo, createTestRepo, git, testGitClient } from "../../test/helpers/git.js";
import { createBufferWriter } from "../../test/helpers/init.js";

async function indexCurrentHead(repoDir: string): Promise<void> {
  const app = await openWarp({ cwd: repoDir });
  await indexHead({
    cwd: repoDir,
    git: testGitClient,
    pathOps: nodePathOps,
    ctx: { app, strandId: null },
  });
}

async function runDeadSymbols(repoDir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({ cwd: repoDir, args, stdout, stderr });
  return { stdout: stdout.text(), stderr: stderr.text() };
}

describe("WARP_dead-symbol-detection playback", () => {
  it("Can I list symbols removed from indexed history and not re-added?", async () => {
    const repoDir = createTestRepo("graft-dead-symbol-playback-");
    try {
      fs.writeFileSync(
        path.join(repoDir, "legacy.ts"),
        "export function legacyUser(): string { return 'legacy'; }\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m add-legacy");
      await indexCurrentHead(repoDir);

      fs.writeFileSync(path.join(repoDir, "legacy.ts"), "// removed\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m remove-legacy");
      await indexCurrentHead(repoDir);

      const human = await runDeadSymbols(repoDir, ["struct", "dead-symbols", "--limit", "2"]);
      expect(human.stderr).toBe("");
      expect(human.stdout).toContain("Graft Dead Symbols");
      expect(human.stdout).toContain("legacy.ts: legacyUser");

      const json = await runDeadSymbols(repoDir, ["struct", "dead-symbols", "--limit", "2", "--json"]);
      expect(json.stderr).toBe("");
      const parsed = JSON.parse(json.stdout) as {
        _schema: { id: string };
        symbols: { name: string; filePath: string }[];
        total: number;
      };
      expect(parsed._schema.id).toBe("graft.cli.struct_dead_symbols");
      expect(parsed.total).toBe(1);
      expect(parsed.symbols).toEqual([
        expect.objectContaining({ name: "legacyUser", filePath: "legacy.ts" }),
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
