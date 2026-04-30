import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { refactorDifficultyFromGraph } from "../../../src/warp/refactor-difficulty.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: refactor-difficulty", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-refactor-difficulty-");
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
    await ctx.app.core().materialize();
  }

  it("combines aggregate churn curvature with reference friction", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function helper(): string { return 'one'; }\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "import { helper } from './lib';\nexport const value = helper();\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add helper'");
    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function helper(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change helper signature'");
    await index(ctx);

    const result = await refactorDifficultyFromGraph(ctx, {
      symbol: "helper",
      path: "lib.ts",
    });

    expect(result.entries.length).toBe(1);
    const entry = result.entries[0]!;
    expect(entry.curvature.changeCount).toBe(2);
    expect(entry.curvature.signatureChangeCount).toBe(1);
    expect(entry.curvature.score).toBe(3);
    expect(entry.friction.referenceCount).toBe(1);
    expect(entry.friction.referencingFiles).toEqual(["app.ts"]);
    expect(entry.score).toBe(3);
    expect(entry.recommendation).toBe("refactor_freely");
  });

  it("keeps high-churn symbols low risk when no other file references them", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "local.ts"),
      "export function volatile(): string { return 'one'; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add volatile'");
    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(
      path.join(tmpDir, "local.ts"),
      "export function volatile(input: string): string { return input; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change volatile'");
    await index(ctx);

    const result = await refactorDifficultyFromGraph(ctx, {
      symbol: "volatile",
      path: "local.ts",
    });

    const entry = result.entries[0]!;
    expect(entry.curvature.score).toBeGreaterThan(0);
    expect(entry.friction.referenceCount).toBe(0);
    expect(entry.score).toBe(0);
    expect(entry.risk).toBe("low");
    expect(entry.recommendation).toBe("refactor_freely");
  });

  it("returns duplicate symbol matches ranked by score when path is omitted", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function shared(): string { return 'lib'; }\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "other.ts"),
      "export function shared(): string { return 'other'; }\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "import { shared } from './lib';\nexport const value = shared();\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add shared symbols'");
    const ctx = await openCtx();
    await index(ctx);

    const result = await refactorDifficultyFromGraph(ctx, { symbol: "shared" });

    expect(result.total).toBe(2);
    expect(result.entries.map((entry) => entry.filePath)).toEqual(["lib.ts", "other.ts"]);
    expect(result.entries[0]!.score).toBeGreaterThan(result.entries[1]!.score);
  });

  it("returns an empty result for unindexed symbols", async () => {
    const ctx = await openCtx();
    const result = await refactorDifficultyFromGraph(ctx, { symbol: "missing" });

    expect(result.entries).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.summary).toContain("No indexed symbols");
  });
});
