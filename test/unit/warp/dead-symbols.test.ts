import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { findDeadSymbols } from "../../../src/warp/dead-symbols.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: dead-symbol-detection", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-dead-sym-");
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

  it("returns empty when no symbols have been removed", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "export function greet(): string { return 'hello'; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");

    const ctx = await openCtx();
    await index(ctx);

    const dead = await findDeadSymbols(ctx);
    expect(dead).toEqual([]);
  });

  it("detects a symbol removed and not re-added", async () => {
    // Commit 1: add two functions
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\nexport function sub(a: number, b: number): number { return a - b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math functions'");

    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: remove sub
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove sub'");
    await index(ctx);

    const dead = await findDeadSymbols(ctx);
    expect(dead.length).toBe(1);
    expect(dead[0]!.name).toBe("sub");
    expect(dead[0]!.filePath).toContain("math.ts");
  });

  it("excludes symbols that were removed then re-added", async () => {
    // Commit 1: add function
    fs.writeFileSync(
      path.join(tmpDir, "util.ts"),
      "export function helper(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add helper'");

    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: remove it
    fs.writeFileSync(path.join(tmpDir, "util.ts"), "// empty\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove helper'");
    await index(ctx);

    // Commit 3: re-add it
    fs.writeFileSync(
      path.join(tmpDir, "util.ts"),
      "export function helper(): void { /* restored */ }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'restore helper'");
    await index(ctx);

    const dead = await findDeadSymbols(ctx);
    expect(dead).toEqual([]);
  });

  it("respects maxCommits to limit search depth", async () => {
    // Commit 1: add function
    fs.writeFileSync(
      path.join(tmpDir, "old.ts"),
      "export function ancient(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add ancient'");

    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: remove it
    fs.writeFileSync(path.join(tmpDir, "old.ts"), "// cleared\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove ancient'");
    await index(ctx);

    // Commit 3: unrelated change
    fs.writeFileSync(
      path.join(tmpDir, "new.ts"),
      "export function fresh(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add fresh'");
    await index(ctx);

    // maxCommits=1 should only see commit 3 (no removals there)
    const shallow = await findDeadSymbols(ctx, { maxCommits: 1 });
    expect(shallow).toEqual([]);

    // maxCommits=2 should see commit 2 (removal of ancient)
    const deeper = await findDeadSymbols(ctx, { maxCommits: 2 });
    expect(deeper.length).toBe(1);
    expect(deeper[0]!.name).toBe("ancient");
  });

  it("detects removals across multiple files", async () => {
    // Commit 1: add functions in two files
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export function alpha(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export function beta(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add alpha and beta'");

    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: remove both
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "// empty\n");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "// empty\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove both'");
    await index(ctx);

    const dead = await findDeadSymbols(ctx);
    const names = dead.map((d) => d.name).sort();
    expect(names).toEqual(["alpha", "beta"]);
  });
});
