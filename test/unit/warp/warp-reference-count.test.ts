import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { countSymbolReferencesFromGraph } from "../../../src/warp/warp-reference-count.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: warp-reference-count", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-warp-refcount-");
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

  // Golden path: multi-file imports → count=2
  it("counts references from multiple importing files", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function createUser(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "handler.ts"),
      "import { createUser } from './lib';\ncreateUser();\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "service.ts"),
      "import { createUser } from './lib';\ncreateUser();\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'multi-file imports'");

    const ctx = await openCtx();
    await index(ctx);

    const result = await countSymbolReferencesFromGraph(ctx, "createUser", "lib.ts");
    expect(result.referenceCount).toBe(2);
    expect([...result.referencingFiles].sort()).toEqual(["handler.ts", "service.ts"]);
  });

  // Edge: unused symbol → count=0
  it("returns count=0 for an exported but never imported symbol", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "unused.ts"),
      "export function orphan(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'unused symbol'");

    const ctx = await openCtx();
    await index(ctx);

    const result = await countSymbolReferencesFromGraph(ctx, "orphan", "unused.ts");
    expect(result.referenceCount).toBe(0);
    expect(result.referencingFiles).toEqual([]);
  });

  // Edge: same-name different file → only count refs to the right one
  it("distinguishes same-named symbols in different files", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export function init(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export function init(): void {}\n");
    fs.writeFileSync(
      path.join(tmpDir, "consumer.ts"),
      "import { init } from './a';\ninit();\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'same name diff files'");

    const ctx = await openCtx();
    await index(ctx);

    const refsToA = await countSymbolReferencesFromGraph(ctx, "init", "a.ts");
    const refsToB = await countSymbolReferencesFromGraph(ctx, "init", "b.ts");

    expect(refsToA.referenceCount).toBe(1);
    expect(refsToA.referencingFiles).toEqual(["consumer.ts"]);
    expect(refsToB.referenceCount).toBe(0);
  });

  // Edge: symbol not in graph → graceful count=0
  it("returns count=0 for a symbol not in the graph", async () => {
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");

    const ctx = await openCtx();
    await index(ctx);

    const result = await countSymbolReferencesFromGraph(ctx, "noSuchSymbol", "app.ts");
    expect(result.referenceCount).toBe(0);
    expect(result.referencingFiles).toEqual([]);
  });

  // Edge: re-export counts as reference
  it("counts re-exports as references", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "core.ts"),
      "export function engine(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "index.ts"),
      "export { engine } from './core';\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 're-export'");

    const ctx = await openCtx();
    await index(ctx);

    const result = await countSymbolReferencesFromGraph(ctx, "engine", "core.ts");
    expect(result.referenceCount).toBe(1);
    expect(result.referencingFiles).toEqual(["index.ts"]);
  });
});
