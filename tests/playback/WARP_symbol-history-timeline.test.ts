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

async function runSymbolHistory(repoDir: string, args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  const stdout = createBufferWriter();
  const stderr = createBufferWriter();
  await runCli({ cwd: repoDir, args, stdout, stderr });
  return { stdout: stdout.text(), stderr: stderr.text() };
}

describe("WARP_symbol-history-timeline playback", () => {
  it("Can I read a human symbol timeline from indexed WARP history?", async () => {
    const repoDir = createTestRepo("graft-symbol-history-playback-");
    try {
      fs.writeFileSync(
        path.join(repoDir, "api.ts"),
        "export function buildThing(): string { return 'v1'; }\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m add-build-thing");
      await indexCurrentHead(repoDir);

      fs.writeFileSync(
        path.join(repoDir, "api.ts"),
        "export function buildThing(input: string): string { return input; }\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m change-build-thing");
      await indexCurrentHead(repoDir);

      const human = await runSymbolHistory(repoDir, ["symbol", "history", "buildThing", "--path", "api.ts"]);
      expect(human.stderr).toBe("");
      expect(human.stdout).toContain("Graft Symbol History");
      expect(human.stdout).toContain("symbol: buildThing");
      expect(human.stdout).toContain("Timeline");
      expect(human.stdout).toContain("added");
      expect(human.stdout).toContain("changed");
      expect(human.stdout).toContain("api.ts:1-1");

      const json = await runSymbolHistory(repoDir, ["symbol", "history", "buildThing", "--path", "api.ts", "--json"]);
      expect(json.stderr).toBe("");
      const parsed = JSON.parse(json.stdout) as {
        _schema: { id: string };
        symbol: string;
        history: {
          changeKind: string;
          path: string;
          startLine?: number;
          endLine?: number;
        }[];
      };
      expect(parsed._schema.id).toBe("graft.cli.symbol_blame");
      expect(parsed.symbol).toBe("buildThing");
      expect(parsed.history.map((entry) => entry.changeKind)).toEqual(["added", "changed"]);
      expect(parsed.history[0]).toEqual(expect.objectContaining({
        path: "api.ts",
        startLine: 1,
        endLine: 1,
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
