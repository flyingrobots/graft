import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { structuralLogFromGraph } from "../../../src/warp/warp-structural-log.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: structural-log-from-graph", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-warp-log-");
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

  it("returns structural log entries from WARP graph without git log", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "export function serve(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add serve'");
    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "export function serve(port: number): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change serve'");
    await index(ctx);

    const entries = await structuralLogFromGraph(ctx, { limit: 10 });

    expect(entries.length).toBe(2);
    // Most recent first
    expect(entries[0]!.symbols.changed.length + entries[0]!.symbols.added.length).toBeGreaterThan(0);
  });

  it("returns empty for repo with no indexed commits", async () => {
    const ctx = await openCtx();
    const entries = await structuralLogFromGraph(ctx, { limit: 10 });
    expect(entries).toEqual([]);
  });

  it("respects limit parameter", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export const a = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'c1'");
    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export const b = 2;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'c2'");
    await index(ctx);

    fs.writeFileSync(path.join(tmpDir, "c.ts"), "export const c = 3;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'c3'");
    await index(ctx);

    const entries = await structuralLogFromGraph(ctx, { limit: 2 });
    expect(entries.length).toBeLessThanOrEqual(2);
  });

  it("includes commit SHA in each entry", async () => {
    fs.writeFileSync(path.join(tmpDir, "x.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const sha = git(tmpDir, "rev-parse HEAD");
    const ctx = await openCtx();
    await index(ctx);

    const entries = await structuralLogFromGraph(ctx, { limit: 10 });
    expect(entries.length).toBe(1);
    expect(entries[0]!.sha).toBe(sha);
  });
});
