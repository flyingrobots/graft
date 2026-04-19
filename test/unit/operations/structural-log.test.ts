import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import { symbolsForCommit } from "../../../src/warp/structural-queries.js";
import { structuralLog } from "../../../src/operations/structural-log.js";
import type { WarpHandle } from "../../../src/ports/warp.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

function commitSha(cwd: string, ref = "HEAD"): string {
  return git(cwd, `rev-parse ${ref}`);
}

describe("operations: structural-log", { timeout: 20000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-structural-log-");
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

  it("returns entries with commit metadata and symbol changes", async () => {
    // Single commit adding two functions — mirrors the structural-queries test
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\nexport function sub(a: number, b: number): number { return a - b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math functions'");
    const sha = commitSha(tmpDir);

    const warp = await indexRepo();
    const entries = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
    });

    expect(entries.length).toBe(1);
    const entry = entries[0]!;

    expect(entry.sha).toBe(sha);
    expect(entry.message).toBe("add math functions");
    expect(entry.author).toBeTruthy();
    expect(entry.date).toBeTruthy();
    expect(entry.symbols.added.length).toBe(2);
    expect(entry.symbols.added.map((s) => s.name).sort()).toEqual(["add", "sub"]);
    expect(entry.summary).toContain("added");
  });

  it("shows changes across multiple commits", async () => {
    // Commit 1: add a function
    fs.writeFileSync(
      path.join(tmpDir, "greet.ts"),
      "export function greet(name: string): string { return `Hello ${name}`; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");
    const sha1 = commitSha(tmpDir);

    // Index after commit 1
    let warp = await indexRepo();
    const e1 = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
    });
    expect(e1.length).toBe(1);
    expect(e1[0]!.symbols.added.map((s) => s.name)).toContain("greet");

    // Commit 2: modify signature
    fs.writeFileSync(
      path.join(tmpDir, "greet.ts"),
      "export function greet(name: string, title?: string): string { return `Hello ${title ?? ''} ${name}`; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add optional title param'");
    const sha2 = commitSha(tmpDir);

    // Re-index
    warp = await openWarp({ cwd: tmpDir });
    const reindex = await indexCommits(warp, { cwd: tmpDir, git: nodeGit });
    assertOk(reindex);

    const e2 = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
    });

    // Newest first — sha2 then sha1
    expect(e2.length).toBe(2);
    expect(e2[0]!.sha).toBe(sha2);
    expect(e2[1]!.sha).toBe(sha1);

    // sha2 should show greet as changed
    expect(e2[0]!.symbols.changed.map((s) => s.name)).toContain("greet");
  });

  it("respects limit option", async () => {
    // Create 3 commits with symbols
    for (let i = 0; i < 3; i++) {
      fs.writeFileSync(
        path.join(tmpDir, `file${String(i)}.ts`),
        `export function fn${String(i)}(): void {}\n`,
      );
      git(tmpDir, "add -A");
      git(tmpDir, `commit -m 'add fn${String(i)}'`);
    }

    const warp = await indexRepo();
    const entries = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
      limit: 2,
    });

    expect(entries.length).toBe(2);
  });

  it("filters by path", async () => {
    // Create files in different directories
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "lib"), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, "src", "app.ts"),
      "export function handleRequest(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "lib", "utils.ts"),
      "export function formatDate(): string { return ''; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add app and utils'");

    const warp = await indexRepo();
    const entries = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
      path: "src",
    });

    // Should only include symbols from src/
    for (const entry of entries) {
      for (const sym of [...entry.symbols.added, ...entry.symbols.removed, ...entry.symbols.changed]) {
        expect(sym.filePath).toMatch(/^src\//);
      }
    }
  });

  it("uses since option to filter commit range", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "base.ts"),
      "export function base(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'base commit'");
    const baseRef = commitSha(tmpDir);

    fs.writeFileSync(
      path.join(tmpDir, "newer.ts"),
      "export function newer(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'newer commit'");

    const warp = await indexRepo();
    const entries = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
      since: baseRef,
    });

    // Should only include commits after baseRef
    expect(entries.length).toBe(1);
    expect(entries[0]!.message).toBe("newer commit");
  });

  it("returns empty array for no commits in range", async () => {
    // Create a commit so indexing succeeds
    fs.writeFileSync(
      path.join(tmpDir, "empty.ts"),
      "export const x = 1;\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'initial'");

    const warp = await indexRepo();
    const entries = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
      since: "HEAD",
    });

    expect(entries).toEqual([]);
  });

  it("builds human-readable summary strings", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "summary.ts"),
      "export function alpha(): void {}\nexport function beta(): void {}\nexport function gamma(): void {}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add three functions'");

    const warp = await indexRepo();
    const entries = await structuralLog({
      querySymbols: (s) => symbolsForCommit(warp, s),
      git: nodeGit,
      cwd: tmpDir,
      limit: 1,
    });

    expect(entries.length).toBe(1);
    expect(entries[0]!.summary).toContain("added");
  });
});
