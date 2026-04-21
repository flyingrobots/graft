import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import { symbolsForCommit, commitsForSymbol } from "../../../src/warp/structural-queries.js";
import type { WarpContext } from "../../../src/warp/context.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

function commitSha(cwd: string, ref = "HEAD"): string {
  return git(cwd, `rev-parse ${ref}`);
}

describe("warp: structural-queries", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-structural-queries-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function indexRepo(): Promise<WarpContext> {
    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };
    const result = await indexCommits(ctx, { cwd: tmpDir, git: nodeGit });
    assertOk(result);
    return ctx;
  }

  describe("symbolsForCommit", () => {
    it("returns added symbols for a commit that adds functions", async () => {
      fs.writeFileSync(
        path.join(tmpDir, "math.ts"),
        "export function add(a: number, b: number): number { return a + b; }\nexport function sub(a: number, b: number): number { return a - b; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add math functions'");

      const sha = commitSha(tmpDir);
      const warp = await indexRepo();
      const result = await symbolsForCommit(warp, sha);

      expect(result.sha).toBe(sha);
      expect(result.added.length).toBe(2);

      const names = result.added.map((s) => s.name).sort();
      expect(names).toEqual(["add", "sub"]);

      for (const sym of result.added) {
        expect(sym.kind).toBe("function");
        expect(sym.exported).toBe(true);
        expect(sym.filePath).toBe("math.ts");
      }

      expect(result.removed).toEqual([]);
      expect(result.changed).toEqual([]);
    });

    it("returns changed symbols when a function signature is modified", async () => {
      // Commit 1: original function
      fs.writeFileSync(
        path.join(tmpDir, "greet.ts"),
        "export function greet(name: string): string { return name; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add greet'");

      // Commit 2: change signature
      fs.writeFileSync(
        path.join(tmpDir, "greet.ts"),
        "export function greet(name: string, greeting: string): string { return `${greeting} ${name}`; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'change greet signature'");

      const sha = commitSha(tmpDir);
      const warp = await indexRepo();
      const result = await symbolsForCommit(warp, sha);

      expect(result.sha).toBe(sha);
      expect(result.changed.length).toBe(1);
      const changedSym = result.changed[0];
      expect(changedSym).toBeDefined();
      expect(changedSym!.name).toBe("greet");
      expect(changedSym!.kind).toBe("function");
      expect(changedSym!.filePath).toBe("greet.ts");

      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
    });

    it("returns removed symbols when a function is deleted", async () => {
      // Commit 1: two functions
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

      const sha = commitSha(tmpDir);
      const warp = await indexRepo();
      const result = await symbolsForCommit(warp, sha);

      expect(result.sha).toBe(sha);
      expect(result.removed.length).toBe(1);
      const removedSym = result.removed[0];
      expect(removedSym).toBeDefined();
      expect(removedSym!.name).toBe("bar");
      expect(removedSym!.filePath).toBe("utils.ts");
    });
  });

  describe("commitsForSymbol", () => {
    it("returns commits that touched a symbol in order", async () => {
      // Commit 1: add function
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function start(): void {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add start'");
      const sha1 = commitSha(tmpDir);

      // Commit 2: change function
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function start(port: number): void {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'change start'");
      const sha2 = commitSha(tmpDir);

      const warp = await indexRepo();
      const history = await commitsForSymbol(warp, "start");

      expect(history.symbol).toBe("start");
      expect(history.commits.length).toBe(2);

      const shas = history.commits.map((c) => c.sha);
      expect(shas).toContain(sha1);
      expect(shas).toContain(sha2);

      const addedCommit = history.commits.find((c) => c.sha === sha1);
      expect(addedCommit?.changeKind).toBe("added");

      const changedCommit = history.commits.find((c) => c.sha === sha2);
      expect(changedCommit?.changeKind).toBe("changed");
    });

    it("filters by filePath when provided", async () => {
      // Same symbol name in two files
      fs.writeFileSync(
        path.join(tmpDir, "a.ts"),
        "export function init(): void {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "b.ts"),
        "export function init(): void {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add init in both files'");

      const warp = await indexRepo();

      // Without filter — both files
      const allHistory = await commitsForSymbol(warp, "init");
      expect(allHistory.commits.length).toBe(2);

      // With filter — only a.ts
      const filteredHistory = await commitsForSymbol(warp, "init", "a.ts");
      expect(filteredHistory.commits.length).toBe(1);
      expect(filteredHistory.filePath).toBe("a.ts");
    });
  });
});
