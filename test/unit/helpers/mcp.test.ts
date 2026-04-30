import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import type WarpApp from "@git-stunts/git-warp";
import type { WarpPool } from "../../../src/mcp/warp-pool.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

describe("test helper: MCP server isolation", () => {
  it("scrubs inherited live-repo Git environment for createServerInRepo", async () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    const repoDir = createTestRepo("graft-mcp-helper-env-");
    const previousGitDir = process.env["GIT_DIR"];
    const previousGitWorkTree = process.env["GIT_WORK_TREE"];
    try {
      process.env["GIT_DIR"] = path.join(repoRoot, ".git");
      process.env["GIT_WORK_TREE"] = repoRoot;
      fs.writeFileSync(path.join(repoDir, "app.ts"), "export const isolated = true;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      const server = createServerInRepo(repoDir);
      const result = parse(await server.callTool("safe_read", { path: "app.ts" }));

      expect(result["projection"]).toBe("content");
      expect(result["path"]).toBe(path.join(repoDir, "app.ts"));
      expect(result["content"]).toContain("isolated");
    } finally {
      if (previousGitDir === undefined) {
        delete process.env["GIT_DIR"];
      } else {
        process.env["GIT_DIR"] = previousGitDir;
      }
      if (previousGitWorkTree === undefined) {
        delete process.env["GIT_WORK_TREE"];
      } else {
        process.env["GIT_WORK_TREE"] = previousGitWorkTree;
      }
      cleanupTestRepo(repoDir);
    }
  });

  it("does not eagerly open WARP local-history graph for createServerInRepo", async () => {
    const repoDir = createTestRepo("graft-mcp-helper-no-eager-warp-");
    const warpPool: WarpPool = {
      getOrOpen(): Promise<WarpApp> {
        throw new Error("unexpected eager WARP open");
      },
      size(): number {
        return 0;
      },
    };
    try {
      fs.writeFileSync(path.join(repoDir, "app.ts"), "export const ready = true;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      const server = createServerInRepo(repoDir, { warpPool });
      const result = parse(await server.callTool("safe_read", { path: "app.ts" }));

      expect(result["projection"]).toBe("content");
      expect(result["content"]).toContain("ready");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
