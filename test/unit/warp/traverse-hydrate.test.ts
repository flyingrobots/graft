import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { traverseAndHydrate } from "../../../src/warp/traverse-hydrate.js";
import { observeGraph, type WarpContext } from "../../../src/warp/context.js";

describe("warp: traverse-hydrate helper", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-traverse-hydrate-");
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

  it("returns hydrated nodes from a single BFS + query call", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function foo(): void {}\nexport function bar(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add lib'");
    const sha = git(tmpDir, "rev-parse HEAD");

    const ctx = await openCtx();
    await index(ctx);

    const obs = await observeGraph(ctx, {
      match: ["commit:*", "sym:*"],
      expose: ["name", "kind", "sha", "tick"],
    });

    // Traverse from commit node to sym nodes via "adds" edges
    const nodes = await traverseAndHydrate(obs, `commit:${sha}`, {
      dir: "out",
      labelFilter: "adds",
      maxDepth: 1,
    });

    const symNodes = nodes.filter((n) => n.id.startsWith("sym:"));
    expect(symNodes.length).toBeGreaterThan(0);

    // Each node should have hydrated props
    for (const node of symNodes) {
      expect(node.props).toBeDefined();
      expect(typeof node.props["name"]).toBe("string");
    }
  });

  it("returns empty array when no nodes are reachable", async () => {
    fs.writeFileSync(path.join(tmpDir, "x.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const ctx = await openCtx();
    await index(ctx);

    const obs = await observeGraph(ctx, { match: "commit:*" });

    const nodes = await traverseAndHydrate(obs, "commit:nonexistent", {
      dir: "out",
      labelFilter: "adds",
      maxDepth: 1,
    });

    expect(nodes).toEqual([]);
  });
});
