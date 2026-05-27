import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { openWarp } from "../../../src/warp/open.js";
import { cleanupTestRepo, createTestRepo, git, testGitClient } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

async function indexCurrentHead(repoDir: string): Promise<void> {
  const app = await openWarp({ cwd: repoDir });
  await indexHead({
    cwd: repoDir,
    git: testGitClient,
    pathOps: nodePathOps,
    ctx: { app, strandId: null },
  });
}

describe("mcp: graft_blame", () => {
  it("returns per-version path and line ranges for symbol history entries", async () => {
    const repoDir = createTestRepo("graft-blame-history-location-");
    try {
      fs.writeFileSync(
        path.join(repoDir, "api.ts"),
        "export function buildThing(): string {\n  return 'v1';\n}\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m add-build-thing");
      await indexCurrentHead(repoDir);

      fs.writeFileSync(
        path.join(repoDir, "api.ts"),
        "export function buildThing(input: string): string {\n  return input;\n}\n",
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m change-build-thing");
      await indexCurrentHead(repoDir);

      const server = createServerInRepo(repoDir);
      const result = parse(await server.callTool("graft_blame", {
        symbol: "buildThing",
        path: "api.ts",
      }));

      const history = result["history"] as {
        path?: string;
        startLine?: number;
        endLine?: number;
      }[];
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(expect.objectContaining({
        path: "api.ts",
        startLine: 1,
        endLine: 3,
      }));
      expect(history[1]).toEqual(expect.objectContaining({
        path: "api.ts",
        startLine: 1,
        endLine: 3,
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("keeps paths on removed history entries without requiring line ranges", async () => {
    const repoDir = createTestRepo("graft-blame-history-removed-location-");
    try {
      fs.writeFileSync(path.join(repoDir, "removed.ts"), "export function gone(): void {}\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m add-gone");
      await indexCurrentHead(repoDir);

      fs.writeFileSync(path.join(repoDir, "removed.ts"), "// gone\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m remove-gone");
      await indexCurrentHead(repoDir);

      const server = createServerInRepo(repoDir);
      const result = parse(await server.callTool("graft_blame", {
        symbol: "gone",
        path: "removed.ts",
      }));

      const history = result["history"] as {
        changeKind: string;
        path?: string;
        startLine?: number;
        endLine?: number;
      }[];
      expect(history).toHaveLength(2);
      expect(history[1]).toEqual(expect.objectContaining({
        changeKind: "removed",
        path: "removed.ts",
      }));
      expect(history[1]?.startLine).toBeUndefined();
      expect(history[1]?.endLine).toBeUndefined();
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
