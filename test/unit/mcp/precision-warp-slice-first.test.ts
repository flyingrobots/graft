import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { getIndexedCommitCeilings } from "../../../src/mcp/tools/precision-warp.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("precision-warp: slice-first reads", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-precision-slice-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function openCtx(): Promise<WarpContext> {
    const warp = await openWarp({ cwd: tmpDir });
    return { app: warp, strandId: null };
  }

  async function index(ctx: WarpContext): Promise<void> {
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
  }

  describe("getIndexedCommitCeilings", () => {
    it("returns SHA→tick map for indexed commits", async () => {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'init'");
      const sha = git(tmpDir, "rev-parse HEAD");

      const ctx = await openCtx();
      await index(ctx);

      const ceilings = await getIndexedCommitCeilings(ctx);
      expect(ceilings.size).toBeGreaterThan(0);
      expect(ceilings.has(sha)).toBe(true);
      expect(typeof ceilings.get(sha)).toBe("number");
    });
  });

});
