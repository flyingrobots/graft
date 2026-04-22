import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import { findDeadSymbols } from "../../../src/warp/dead-symbols.js";
import type { WarpHandle } from "../../../src/ports/warp.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

describe("warp: dead-symbols", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-dead-symbols-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function indexRepo(): Promise<WarpHandle> {
    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(result);
    return warp;
  }

  it("returns empty when no symbols have been removed", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math'");

    const warp = await indexRepo();
    const dead = await findDeadSymbols(warp);
    expect(dead).toEqual([]);
  });

  it("returns a symbol that was removed and never re-added", async () => {
    // Commit 1: add two functions
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function foo(): void {}\nexport function bar(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add utils'");

    // Commit 2: remove bar
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      "export function foo(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove bar'");

    const warp = await indexRepo();
    const dead = await findDeadSymbols(warp);
    expect(dead.length).toBe(1);
    expect(dead[0]!.name).toBe("bar");
    expect(dead[0]!.filePath).toBe("utils.ts");
    expect(dead[0]!.removedInCommit).toBeDefined();
  });

  it("excludes a symbol that was removed then re-added", async () => {
    // Commit 1: add function
    fs.writeFileSync(
      path.join(tmpDir, "toggle.ts"),
      "export function toggle(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add toggle'");

    // Commit 2: remove function
    fs.writeFileSync(
      path.join(tmpDir, "toggle.ts"),
      "// empty\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove toggle'");

    // Commit 3: re-add function
    fs.writeFileSync(
      path.join(tmpDir, "toggle.ts"),
      "export function toggle(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 're-add toggle'");

    const warp = await indexRepo();
    const dead = await findDeadSymbols(warp);
    expect(dead).toEqual([]);
  });

  it("respects the maxCommits option to limit search depth", async () => {
    // Commit 1: add ancient
    fs.writeFileSync(
      path.join(tmpDir, "old.ts"),
      "export function ancient(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add ancient'");

    // Commit 2: remove ancient
    fs.writeFileSync(
      path.join(tmpDir, "old.ts"),
      "// empty\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove ancient'");

    // Commit 3: add recent
    fs.writeFileSync(
      path.join(tmpDir, "new.ts"),
      "export function recent(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add recent'");

    // Commit 4: remove recent
    fs.writeFileSync(
      path.join(tmpDir, "new.ts"),
      "// empty\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove recent'");

    const warp = await indexRepo();

    // Only look at the last 2 commits — should find recent but not ancient
    const dead = await findDeadSymbols(warp, { maxCommits: 2 });
    const names = dead.map((d) => d.name);
    expect(names).toContain("recent");
    expect(names).not.toContain("ancient");
  });

  it("handles multiple removals across different files", async () => {
    // Commit 1: add functions in two files
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function alphaFn(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "b.ts"),
      "export function betaFn(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add alpha and beta'");

    // Commit 2: remove both
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "// empty\n");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "// empty\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'remove both'");

    const warp = await indexRepo();
    const dead = await findDeadSymbols(warp);
    const names = dead.map((d) => d.name).sort();
    expect(names).toEqual(["alphaFn", "betaFn"]);

    const filePaths = dead.map((d) => d.filePath).sort();
    expect(filePaths).toEqual(["a.ts", "b.ts"]);
  });
});
