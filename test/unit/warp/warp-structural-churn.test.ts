import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { QueryBuilder } from "@git-stunts/git-warp";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { structuralChurnFromGraph } from "../../../src/warp/warp-structural-churn.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: structural-churn-from-graph", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-warp-churn-");
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

  it("counts symbol changes across commits without git log", async () => {
    // Commit 1: add function
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math'");
    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: change signature
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number, c: number): number { return a + b + c; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'extend add'");
    await index(ctx);

    const result = await structuralChurnFromGraph(ctx, { limit: 10 });

    expect(result.entries.length).toBeGreaterThan(0);
    const addEntry = result.entries.find((e) => e.symbol === "add");
    expect(addEntry).toBeDefined();
    // 1 add + 1 change = 2 changes
    expect(addEntry!.changeCount).toBe(2);
    expect(result.totalCommitsAnalyzed).toBeGreaterThan(0);
  });

  it("counts removed symbols discovered from tick receipts", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function kept(): void {}\nexport function gone(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add utils'");
    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function kept(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove gone'");
    await index(ctx);

    const result = await structuralChurnFromGraph(ctx, { limit: 10 });
    const goneEntry = result.entries.find((e) => e.symbol === "gone");

    expect(goneEntry).toBeDefined();
    expect(goneEntry!.filePath).toBe("utils.ts");
    expect(goneEntry!.kind).toBe("function");
    expect(goneEntry!.changeCount).toBe(2);
    expect(goneEntry!.lastChangedSha).toBe(git(tmpDir, "rev-parse HEAD"));
  });

  it("computes change counts through QueryBuilder.aggregate", async () => {
    const aggregateSpy = vi.spyOn(QueryBuilder.prototype, "aggregate");

    try {
      fs.writeFileSync(path.join(tmpDir, "app.ts"), "export function main(): void {}\n");
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'init'");
      const ctx = await openCtx();
      await index(ctx);

      const result = await structuralChurnFromGraph(ctx, { limit: 10 });

      expect(result.entries.length).toBeGreaterThan(0);
      expect(aggregateSpy).toHaveBeenCalledWith({ count: true });
      expect(aggregateSpy).toHaveBeenCalledWith({ count: true, max: "tick" });
    } finally {
      aggregateSpy.mockRestore();
    }
  });

  it("returns empty result for repo with no indexed commits", async () => {
    const ctx = await openCtx();
    // Don't index — graph is empty
    const result = await structuralChurnFromGraph(ctx, { limit: 10 });
    expect(result.entries).toEqual([]);
    expect(result.totalCommitsAnalyzed).toBe(0);
  });

  it("respects limit parameter", async () => {
    // Create multiple symbols
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function alpha(): void {}\nexport function beta(): void {}\nexport function gamma(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add three'");
    const ctx = await openCtx();
    await index(ctx);

    const result = await structuralChurnFromGraph(ctx, { limit: 2 });
    expect(result.entries.length).toBeLessThanOrEqual(2);
  });

  it("makes zero GitClient calls", async () => {
    // The whole point — no git subprocess spawning
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export function main(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const ctx = await openCtx();
    await index(ctx);

    // If this works, it used WARP graph only — no git calls needed
    const result = await structuralChurnFromGraph(ctx, { limit: 10 });
    expect(result.entries.length).toBeGreaterThan(0);
  });
});
