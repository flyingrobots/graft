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

    const result = await symbolTimeline(ctx, "greet");
    expect(result.symbol).toBe("greet");
    expect(result.versions.length).toBe(1);
    expect(result.versions[0]!.changeKind).toBe("added");
    expect(result.versions[0]!.present).toBe(true);
    expect(result.versions[0]!.signature).toContain("greet");
  });

  it("tracks signature changes across commits in tick order", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function calc(a: number): number { return a; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add calc v1'");

    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function calc(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'calc v2'");
    await index(ctx);

    const result = await symbolTimeline(ctx, "calc");
    expect(result.versions.length).toBe(2);
    expect(result.versions[0]!.tick).toBeLessThan(result.versions[1]!.tick);
    expect(result.versions[0]!.changeKind).toBe("added");
    expect(result.versions[1]!.changeKind).toBe("changed");
    expect(result.versions[0]!.signature).not.toBe(result.versions[1]!.signature);
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

    fs.writeFileSync(path.join(tmpDir, "temp.ts"), "// cleared\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove ephemeral'");
    await index(ctx);

    const result = await symbolTimeline(ctx, "ephemeral", "temp.ts");
    expect(result.versions.length).toBe(2);
    expect(result.versions[0]!.present).toBe(true);
    expect(result.versions[1]!.present).toBe(false);
    expect(result.versions[1]!.changeKind).toBe("removed");
  });

  it("filters by filePath", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export function dup(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export function dup(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add dup in two files'");

    const ctx = await openCtx();
    await index(ctx);

    const all = await symbolTimeline(ctx, "dup");
    const filtered = await symbolTimeline(ctx, "dup", "a.ts");

    expect(all.versions.length).toBeGreaterThanOrEqual(2);
    expect(filtered.versions.length).toBe(1);
    expect(filtered.filePath).toBe("a.ts");
  });

  it("returns empty for nonexistent symbol", async () => {
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");

    const ctx = await openCtx();
    await index(ctx);

    const result = await symbolTimeline(ctx, "doesNotExist");
    expect(result.symbol).toBe("doesNotExist");
    expect(result.versions).toEqual([]);
  });

  it("does not infer removed symbol identity from name-only history", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "temp.ts"),
      "export function gone(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add gone'");

    const ctx = await openCtx();
    await index(ctx);

    fs.writeFileSync(path.join(tmpDir, "temp.ts"), "// gone\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove gone'");
    await index(ctx);

    const nameOnly = await symbolTimeline(ctx, "gone");
    const explicit = await symbolTimeline(ctx, "gone", "temp.ts");

    expect(nameOnly.versions).toEqual([]);
    expect(explicit.versions.at(-1)?.changeKind).toBe("removed");
  });
});
