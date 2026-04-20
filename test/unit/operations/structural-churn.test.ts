import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import { structuralChurn } from "../../../src/operations/structural-churn.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { symbolsForCommit } from "../../../src/warp/structural-queries.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

describe("operations: structural-churn", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-structural-churn-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("counts changes for a function modified across multiple commits", async () => {
    // Commit 1: add function
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math'");

    // Commit 2: change function signature
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number, c: number): number { return a + b + c; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'extend add'");

    // Commit 3: change function body (signature changes again for test simplicity)
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(...nums: number[]): number { return nums.reduce((s, n) => s + n, 0); }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'variadic add'");

    const warp = await openWarp({ cwd: tmpDir });
    const idxResult = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(idxResult);

    const result = await structuralChurn({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
    });

    // The function "add" appears in all 3 commits (added + 2 changes)
    const addEntry = result.entries.find((e) => e.symbol === "add");
    expect(addEntry).toBeDefined();
    expect(addEntry!.changeCount).toBeGreaterThanOrEqual(2);
    expect(addEntry!.filePath).toBe("math.ts");
    expect(addEntry!.kind).toBe("function");
    expect(result.totalCommitsAnalyzed).toBe(3);
    expect(result.summary).toContain("add");
  });

  it("ranks symbols by change frequency", async () => {
    // Commit 1: add two functions
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function stable(): void {}\nexport function volatile(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add api'");

    // Commit 2: change volatile only
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function stable(): void {}\nexport function volatile(x: number): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change volatile'");

    // Commit 3: change volatile again
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      "export function stable(): void {}\nexport function volatile(x: number, y: number): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change volatile again'");

    const warp = await openWarp({ cwd: tmpDir });
    const idxResult = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(idxResult);

    const result = await structuralChurn({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
    });

    // volatile should rank higher than stable
    const volatileIdx = result.entries.findIndex((e) => e.symbol === "volatile");
    const stableIdx = result.entries.findIndex((e) => e.symbol === "stable");
    expect(volatileIdx).toBeGreaterThanOrEqual(0);
    expect(stableIdx).toBeGreaterThanOrEqual(0);
    expect(volatileIdx).toBeLessThan(stableIdx);

    const volatileEntry = result.entries[volatileIdx]!;
    const stableEntry = result.entries[stableIdx]!;
    expect(volatileEntry.changeCount).toBeGreaterThan(stableEntry.changeCount);
  });

  it("respects the limit parameter", async () => {
    // Create a repo with multiple symbols
    fs.writeFileSync(
      path.join(tmpDir, "many.ts"),
      "export function a(): void {}\nexport function b(): void {}\nexport function c(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add many'");

    const warp = await openWarp({ cwd: tmpDir });
    const idxResult = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(idxResult);

    const result = await structuralChurn({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
      limit: 1,
    });

    expect(result.entries.length).toBeLessThanOrEqual(1);
    expect(result.totalSymbols).toBeGreaterThanOrEqual(3);
  });
});

// --- Tests added for churn-path-filter-exact-only cycle ---

describe("operations: structural-churn — directory path filter", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-churn-pathfilter-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("directory path filter matches symbols within directory", async () => {
    // Create files in different directories
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "lib"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export function alpha(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "lib/b.ts"), "export function beta(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    // Modify both
    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export function alpha(): string { return \"\"; }\n");
    fs.writeFileSync(path.join(tmpDir, "lib/b.ts"), "export function beta(): string { return \"\"; }\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m modify");

    const warp = await openWarp({ cwd: tmpDir });
    const r1 = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(r1);

    const result = await structuralChurn({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
      path: "src",
    });

    // Should find alpha (in src/) but NOT beta (in lib/)
    const symbols = result.entries.map((e) => e.symbol);
    expect(symbols).toContain("alpha");
    expect(symbols).not.toContain("beta");
  });

  it("exact file path filter still works", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export function alpha(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "src/b.ts"), "export function beta(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export function alpha(): string { return \"\"; }\n");
    fs.writeFileSync(path.join(tmpDir, "src/b.ts"), "export function beta(): string { return \"\"; }\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m modify");

    const warp = await openWarp({ cwd: tmpDir });
    const r1 = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(r1);

    const result = await structuralChurn({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
      path: "src/a.ts",
    });

    const symbols = result.entries.map((e) => e.symbol);
    expect(symbols).toContain("alpha");
    expect(symbols).not.toContain("beta");
  });

  it("directory filter with trailing slash works", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "lib"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export function alpha(): void {}\n");
    fs.writeFileSync(path.join(tmpDir, "lib/b.ts"), "export function beta(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export function alpha(): string { return \"\"; }\n");
    fs.writeFileSync(path.join(tmpDir, "lib/b.ts"), "export function beta(): string { return \"\"; }\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m modify");

    const warp = await openWarp({ cwd: tmpDir });
    const r1 = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(r1);

    const result = await structuralChurn({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      querySymbolsForCommit: (sha) => symbolsForCommit(warp, sha),
      path: "src/",
    });

    const symbols = result.entries.map((e) => e.symbol);
    expect(symbols).toContain("alpha");
    expect(symbols).not.toContain("beta");
  });
});
