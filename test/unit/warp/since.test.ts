import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { observeGraph } from "../../../src/warp/context.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { allSymbolsLens } from "../../../src/warp/observers.js";

async function getCommitTick(ctx: WarpContext, sha: string): Promise<number | null> {
  const obs = await observeGraph(ctx, { match: `commit:${sha}`, expose: ["tick"] });
  const props = await obs.getNodeProps(`commit:${sha}`);
  return typeof props?.["tick"] === "number" ? props["tick"] : null;
}

describe("warp: graft_since (observer comparison)", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-since-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("detects added symbols between two commits", async () => {
    // Commit 1: one function
    fs.writeFileSync(path.join(tmpDir, "app.ts"), 'export function start(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");
    const c1 = git(tmpDir, "rev-parse HEAD");

    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });

    // Commit 2: add a second function
    fs.writeFileSync(path.join(tmpDir, "app.ts"),
      'export function start(): void {}\nexport function stop(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");
    const c2 = git(tmpDir, "rev-parse HEAD");

    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });

    const tick1 = await getCommitTick(ctx, c1);
    const tick2 = await getCommitTick(ctx, c2);
    expect(tick1).toBeDefined();
    expect(tick2).toBeDefined();

    await warp.core().materialize();

    const lens = allSymbolsLens();
    const obs1 = await warp.observer(lens, { source: { kind: "live", ceiling: tick1 ?? null } });
    const obs2 = await warp.observer(lens, { source: { kind: "live", ceiling: tick2 ?? null } });

    const nodes1 = await obs1.getNodes();
    const nodes2 = await obs2.getNodes();

    // At c1: 1 symbol (start). At c2: 2 symbols (start + stop).
    expect(nodes1.length).toBe(1);
    expect(nodes2.length).toBe(2);
  });

  it("detects removed symbols between two commits", async () => {
    fs.writeFileSync(path.join(tmpDir, "utils.ts"),
      'export function foo(): void {}\nexport function bar(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");
    const c1 = git(tmpDir, "rev-parse HEAD");

    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });

    fs.writeFileSync(path.join(tmpDir, "utils.ts"),
      'export function foo(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");
    const c2 = git(tmpDir, "rev-parse HEAD");

    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
    await warp.core().materialize();

    const tick1 = await getCommitTick(ctx, c1);
    const tick2 = await getCommitTick(ctx, c2);
    expect(tick1).toBeDefined();
    expect(tick2).toBeDefined();

    const lens = allSymbolsLens();
    const obs1 = await warp.observer(lens, { source: { kind: "live", ceiling: tick1 ?? null } });
    const obs2 = await warp.observer(lens, { source: { kind: "live", ceiling: tick2 ?? null } });

    const nodes1 = await obs1.getNodes();
    const nodes2 = await obs2.getNodes();

    // At c1: 2 symbols. At c2: 1 symbol (bar removed).
    expect(nodes1.length).toBe(2);
    expect(nodes2.length).toBe(1);
  });

  it("detects signature changes between two commits", async () => {
    fs.writeFileSync(path.join(tmpDir, "api.ts"),
      'export function handle(req: Request): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");
    const c1 = git(tmpDir, "rev-parse HEAD");

    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });

    fs.writeFileSync(path.join(tmpDir, "api.ts"),
      'export function handle(req: Request, res: Response): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");
    const c2 = git(tmpDir, "rev-parse HEAD");

    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
    await warp.core().materialize();

    const tick1 = await getCommitTick(ctx, c1);
    const tick2 = await getCommitTick(ctx, c2);
    expect(tick1).toBeDefined();
    expect(tick2).toBeDefined();

    const lens = allSymbolsLens();
    const obs1 = await warp.observer(lens, { source: { kind: "live", ceiling: tick1 ?? null } });
    const obs2 = await warp.observer(lens, { source: { kind: "live", ceiling: tick2 ?? null } });

    // Same symbol at both ticks
    const nodes1 = await obs1.getNodes();
    const nodes2 = await obs2.getNodes();
    expect(nodes1.length).toBe(1);
    expect(nodes2.length).toBe(1);

    // But different signatures
    const props1 = await obs1.getNodeProps(nodes1[0]!);
    const props2 = await obs2.getNodeProps(nodes2[0]!);
    expect(props1?.["signature"]).toContain("req: Request)");
    expect(props2?.["signature"]).toContain("res: Response");
  });
});
