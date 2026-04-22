import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import {
  extractDocSymbolReferences,
  checkStaleDocs,
  checkVersionDrift,
  type StaleDocReport,
  type VersionDriftReport,
} from "../../../src/warp/stale-docs.js";
import type { WarpHandle } from "../../../src/ports/warp.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

function commitSha(cwd: string, ref = "HEAD"): string {
  return git(cwd, `rev-parse ${ref}`);
}

describe("warp: stale-docs", { timeout: 15000 }, () => {
  describe("extractDocSymbolReferences", () => {
    it("extracts backtick-quoted identifiers from markdown", () => {
      const md = "The `evaluatePolicy` function calls `runCheck` internally.";
      const refs = extractDocSymbolReferences(md);
      expect(refs).toContain("evaluatePolicy");
      expect(refs).toContain("runCheck");
      expect(refs.length).toBe(2);
    });

    it("extracts identifiers from fenced code blocks", () => {
      const md = [
        "# Example",
        "```ts",
        "import { evaluatePolicy } from './policy.js';",
        "const result = evaluatePolicy(input);",
        "```",
      ].join("\n");
      const refs = extractDocSymbolReferences(md);
      expect(refs).toContain("evaluatePolicy");
    });

    it("deduplicates references", () => {
      const md = "Use `add` to sum. The `add` function is pure.";
      const refs = extractDocSymbolReferences(md);
      expect(refs.filter((r) => r === "add").length).toBe(1);
    });

    it("ignores non-identifier backtick content", () => {
      const md = "Run `npm install` and then `cd ..` to go up.";
      const refs = extractDocSymbolReferences(md);
      // "npm install" and "cd .." contain spaces/dots — not identifiers
      expect(refs).not.toContain("npm install");
      expect(refs).not.toContain("cd ..");
    });

    it("returns empty array for markdown with no references", () => {
      const md = "This is a plain document with no code references.";
      const refs = extractDocSymbolReferences(md);
      expect(refs).toEqual([]);
    });
  });

  describe("checkStaleDocs", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = createTestRepo("graft-stale-docs-");
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

    it("flags a doc that references a symbol changed after the doc was last modified", async () => {
      // Commit 1: add function and doc
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function start(): void {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "README.md"),
        "# App\n\nUse `start` to launch the application.\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'initial'");
      const docCommitSha = commitSha(tmpDir);

      // Commit 2: change function signature (doc is now stale)
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function start(port: number): void {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'change start signature'");

      const warp = await indexRepo();
      const docContent = fs.readFileSync(path.join(tmpDir, "README.md"), "utf-8");
      const report = await checkStaleDocs(warp, "README.md", docCommitSha, docContent);

      expect(report.staleSymbols.length).toBeGreaterThanOrEqual(1);
      const staleEntry = report.staleSymbols.find((s) => s.symbol === "start");
      expect(staleEntry).toBeDefined();
      expect(staleEntry!.changeKind).toBe("changed");
    });

    it("does not flag a doc that references a symbol that has not changed", async () => {
      // Commit 1: add function
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function start(): void {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add start'");

      // Commit 2: add doc (after the function, so doc is fresh)
      fs.writeFileSync(
        path.join(tmpDir, "README.md"),
        "# App\n\nUse `start` to launch.\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add docs'");
      const docCommitSha = commitSha(tmpDir);

      const warp = await indexRepo();
      const docContent = fs.readFileSync(path.join(tmpDir, "README.md"), "utf-8");
      const report = await checkStaleDocs(warp, "README.md", docCommitSha, docContent);

      expect(report.staleSymbols.length).toBe(0);
    });

    it("flags a symbol reference that does not exist in the WARP graph as unknown", async () => {
      fs.writeFileSync(
        path.join(tmpDir, "README.md"),
        "# App\n\nThe `nonExistentFunction` handles everything.\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add docs referencing missing symbol'");
      const docCommitSha = commitSha(tmpDir);

      const warp = await indexRepo();
      const docContent = fs.readFileSync(path.join(tmpDir, "README.md"), "utf-8");
      const report = await checkStaleDocs(warp, "README.md", docCommitSha, docContent);

      expect(report.unknownSymbols).toContain("nonExistentFunction");
    });
  });

  describe("checkVersionDrift", () => {
    it("flags when CHANGELOG version differs from package.json version", () => {
      const report = checkVersionDrift("2.0.0", "# Changelog\n\n## 1.9.0\n\n- Added feature X\n");
      expect(report.drifted).toBe(true);
      expect(report.packageVersion).toBe("2.0.0");
      expect(report.changelogVersion).toBe("1.9.0");
    });

    it("does not flag when versions match", () => {
      const report = checkVersionDrift("2.0.0", "# Changelog\n\n## 2.0.0\n\n- Added feature X\n");
      expect(report.drifted).toBe(false);
    });

    it("handles changelog with no version heading", () => {
      const report = checkVersionDrift("1.0.0", "# Changelog\n\nNo versions yet.\n");
      expect(report.drifted).toBe(true);
      expect(report.changelogVersion).toBeNull();
    });
  });
});
