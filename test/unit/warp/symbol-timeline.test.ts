import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { symbolTimeline } from "../../../src/warp/symbol-timeline.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: symbol-timeline", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-sym-timeline-");
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

  it("returns a single entry for a newly added symbol", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "export function greet(): string { return 'hi'; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");

    const ctx = await openCtx();
    await index(ctx);

    const timeline = await symbolTimeline(ctx, "greet");
    expect(timeline.length).toBe(1);
    expect(timeline[0]!.changeKind).toBe("added");
    expect(timeline[0]!.present).toBe(true);
    expect(timeline[0]!.signature).toContain("greet");
  });

  it("tracks signature changes across commits in tick order", async () => {
    // Commit 1: original signature
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function calc(a: number): number { return a; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add calc v1'");

    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: changed signature
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function calc(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'calc v2'");
    await index(ctx);

    const timeline = await symbolTimeline(ctx, "calc");
    expect(timeline.length).toBe(2);

    // Ordered chronologically
    expect(timeline[0]!.tick).toBeLessThan(timeline[1]!.tick);

    // First entry: original signature
    expect(timeline[0]!.changeKind).toBe("added");
    expect(timeline[0]!.signature).toContain("a: number)");

    // Second entry: updated signature
    expect(timeline[1]!.changeKind).toBe("changed");
    expect(timeline[1]!.signature).toContain("b: number");
  });

  it("detects removal with present=false", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "temp.ts"),
      "export function ephemeral(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add ephemeral'");

    const ctx = await openCtx();
    await index(ctx);

    // Remove the symbol
    fs.writeFileSync(path.join(tmpDir, "temp.ts"), "// cleared\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove ephemeral'");
    await index(ctx);

    const timeline = await symbolTimeline(ctx, "ephemeral");
    expect(timeline.length).toBe(2);
    expect(timeline[0]!.present).toBe(true);
    expect(timeline[1]!.present).toBe(false);
    expect(timeline[1]!.changeKind).toBe("removed");
  });

  it("filters by filePath", async () => {
    // Same symbol name in two files
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export function dup(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export function dup(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add dup in two files'");

    const ctx = await openCtx();
    await index(ctx);

    const all = await symbolTimeline(ctx, "dup");
    const filtered = await symbolTimeline(ctx, "dup", "a.ts");

    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(filtered.length).toBe(1);
    expect(filtered[0]!.filePath).toContain("a.ts");
  });

  it("returns empty for nonexistent symbol", async () => {
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");

    const ctx = await openCtx();
    await index(ctx);

    const timeline = await symbolTimeline(ctx, "doesNotExist");
    expect(timeline).toEqual([]);
  });
});
