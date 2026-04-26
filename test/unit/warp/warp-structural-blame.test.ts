import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo, testGitClient } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { structuralBlameFromGraph } from "../../../src/warp/warp-structural-blame.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: structural-blame-from-graph", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-warp-blame-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function openCtx(): Promise<WarpContext> {
    const warp = await openWarp({ cwd: tmpDir });
    return { app: warp, strandId: null };
  }

  async function index(ctx: WarpContext): Promise<void> {
    await indexHead({ cwd: tmpDir, git: testGitClient, pathOps: nodePathOps, ctx });
    await ctx.app.core().materialize();
  }

  it("returns blame info for a symbol from WARP graph without git calls", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function create(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add create'");
    const ctx = await openCtx();
    await index(ctx);

    const blame = await structuralBlameFromGraph(ctx, "create", "lib.ts");

    expect(blame.symbol).toBe("create");
    expect(blame.history.length).toBe(1);
    expect(blame.history[0]!.changeKind).toBe("added");
    expect(blame.createdInCommit).toBeDefined();
  });

  it("tracks signature changes in blame history", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function handle(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add handle'");
    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function handle(req: string): string { return req; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change handle'");
    await index(ctx);

    const blame = await structuralBlameFromGraph(ctx, "handle", "api.ts");

    expect(blame.history.length).toBe(2);
    expect(blame.lastSignatureChange).toBeDefined();
    expect(blame.changeCount).toBe(2);
  });

  it("includes reference count from WARP graph", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function helper(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "import { helper } from './lib';\nhelper();\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add with import'");
    const ctx = await openCtx();
    await index(ctx);

    const blame = await structuralBlameFromGraph(ctx, "helper", "lib.ts");

    expect(blame.referenceCount).toBe(1);
  });

  it("returns empty blame for nonexistent symbol", async () => {
    fs.writeFileSync(path.join(tmpDir, "x.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const ctx = await openCtx();
    await index(ctx);

    const blame = await structuralBlameFromGraph(ctx, "nonexistent", "x.ts");

    expect(blame.history).toEqual([]);
    expect(blame.changeCount).toBe(0);
  });
});
