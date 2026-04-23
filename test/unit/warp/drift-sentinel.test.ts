import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { runDriftSentinel } from "../../../src/warp/drift-sentinel.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: drift-sentinel", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-drift-sentinel-");
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

  it("detects a stale symbol reference after signature change", async () => {
    // Commit 1: source + doc
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function serve(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "README.md"),
      "# API\n\nCall `serve` to start the server.\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'initial'");

    const ctx = await openCtx();
    await index(ctx);

    // Commit 2: change the function signature (doc is now stale)
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function serve(port: number): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change serve'");
    await index(ctx);

    const report = await runDriftSentinel(ctx, {
      cwd: tmpDir,
      git: nodeGit,
    });

    expect(report.passed).toBe(false);
    expect(report.results.length).toBeGreaterThan(0);

    const readmeResult = report.results.find((r) => r.docPath.includes("README.md"));
    expect(readmeResult).toBeDefined();
    expect(readmeResult!.staleSymbols.length).toBeGreaterThan(0);
    expect(readmeResult!.staleSymbols[0]!.symbol).toBe("serve");
  });

  it("passes when docs are fresh (no changes since doc was written)", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "lib.ts"),
      "export function helper(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add lib'");

    const ctx = await openCtx();
    await index(ctx);

    // Doc written AFTER the source — should be fresh
    fs.writeFileSync(
      path.join(tmpDir, "GUIDE.md"),
      "Use `helper` for utility work.\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add guide'");
    await index(ctx);

    const report = await runDriftSentinel(ctx, {
      cwd: tmpDir,
      git: nodeGit,
    });

    expect(report.passed).toBe(true);
    const guideResult = report.results.find((r) => r.docPath.includes("GUIDE.md"));
    if (guideResult) {
      expect(guideResult.staleSymbols).toEqual([]);
    }
  });

  it("produces machine-readable output with file, symbol, and nature", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "core.ts"),
      "export function process(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "docs.md"),
      "The `process` function handles input.\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'initial'");

    const ctx = await openCtx();
    await index(ctx);

    // Remove the function
    fs.writeFileSync(path.join(tmpDir, "core.ts"), "// emptied\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove process'");
    await index(ctx);

    const report = await runDriftSentinel(ctx, {
      cwd: tmpDir,
      git: nodeGit,
    });

    expect(report.passed).toBe(false);
    // Machine-readable: each result has docPath, staleSymbols[], unknownSymbols[]
    const docsResult = report.results.find((r) => r.docPath.includes("docs.md"));
    expect(docsResult).toBeDefined();
    expect(docsResult!.staleSymbols.length + docsResult!.unknownSymbols.length).toBeGreaterThan(0);
  });

  it("returns empty results for a repo with no markdown files", async () => {
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");

    const ctx = await openCtx();
    await index(ctx);

    const report = await runDriftSentinel(ctx, {
      cwd: tmpDir,
      git: nodeGit,
    });

    expect(report.passed).toBe(true);
    expect(report.results).toEqual([]);
  });
});
