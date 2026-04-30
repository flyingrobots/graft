import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import {
  extractDocSymbolReferences,
  checkStaleDocs,
  checkVersionDrift,
} from "../../../src/warp/stale-docs.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: stale-docs-checker", { timeout: 15000 }, () => {
  describe("extractDocSymbolReferences", () => {
    it("extracts backtick-quoted identifiers", () => {
      const refs = extractDocSymbolReferences(
        "The `evaluatePolicy` function calls `runCheck` internally.",
      );
      expect(refs).toContain("evaluatePolicy");
      expect(refs).toContain("runCheck");
    });

    it("extracts identifiers from code blocks", () => {
      const md = "```ts\nimport { createServer } from './server';\n```";
      const refs = extractDocSymbolReferences(md);
      expect(refs).toContain("createServer");
    });

    it("deduplicates references", () => {
      const refs = extractDocSymbolReferences(
        "`foo` and `foo` again, plus `bar`.",
      );
      expect(refs.filter((r) => r === "foo").length).toBe(1);
    });

    it("ignores non-identifier backtick content", () => {
      const refs = extractDocSymbolReferences(
        "`hello world` and `a.b.c` are not identifiers, but `validName` is.",
      );
      expect(refs).not.toContain("hello world");
      expect(refs).not.toContain("a.b.c");
      expect(refs).toContain("validName");
    });

    it("returns empty for docs with no symbol references", () => {
      const refs = extractDocSymbolReferences(
        "This is a plain paragraph with no code references.",
      );
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

    async function openCtx(): Promise<WarpContext> {
      const warp = await openWarp({ cwd: tmpDir });
      return { app: warp, strandId: null };
    }

    async function index(ctx: WarpContext): Promise<void> {
      await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
    }

    it("flags a symbol that changed after the doc was committed", async () => {
      fs.writeFileSync(
        path.join(tmpDir, "api.ts"),
        "export function evaluate(): void {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "README.md"),
        "Use `evaluate` to check policies.\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'initial'");
      const docSha = git(tmpDir, "rev-parse HEAD");

      const ctx = await openCtx();
      await index(ctx);

      fs.writeFileSync(
        path.join(tmpDir, "api.ts"),
        "export function evaluate(policy: string): boolean { return true; }\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'change evaluate'");
      await index(ctx);

      const report = await checkStaleDocs(
        ctx,
        "README.md",
        docSha,
        "Use `evaluate` to check policies.\n",
      );

      expect(report.staleSymbols.length).toBeGreaterThan(0);
      expect(report.staleSymbols[0]!.symbol).toBe("evaluate");
    });

    it("does not flag a symbol that has not changed since the doc", async () => {
      fs.writeFileSync(
        path.join(tmpDir, "stable.ts"),
        "export function helper(): void {}\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add helper'");

      const ctx = await openCtx();
      await index(ctx);

      fs.writeFileSync(
        path.join(tmpDir, "GUIDE.md"),
        "Call `helper` for utility work.\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'add guide'");
      const docSha = git(tmpDir, "rev-parse HEAD");
      await index(ctx);

      const report = await checkStaleDocs(
        ctx,
        "GUIDE.md",
        docSha,
        "Call `helper` for utility work.\n",
      );

      expect(report.staleSymbols).toEqual([]);
    });

    it("reports unknown symbols not in the WARP graph", async () => {
      fs.writeFileSync(
        path.join(tmpDir, "app.ts"),
        "export function exists(): void {}\n",
      );
      fs.writeFileSync(
        path.join(tmpDir, "docs.md"),
        "See `exists` and `noSuchThing` for details.\n",
      );
      git(tmpDir, "add -A");
      git(tmpDir, "commit -m 'init'");
      const docSha = git(tmpDir, "rev-parse HEAD");

      const ctx = await openCtx();
      await index(ctx);

      const report = await checkStaleDocs(
        ctx,
        "docs.md",
        docSha,
        "See `exists` and `noSuchThing` for details.\n",
      );

      expect(report.unknownSymbols).toContain("noSuchThing");
    });
  });

  describe("checkVersionDrift", () => {
    it("detects version mismatch", () => {
      const result = checkVersionDrift("2.0.0", "## 1.5.0\n\n- Added feature X\n");
      expect(result.drifted).toBe(true);
      expect(result.packageVersion).toBe("2.0.0");
      expect(result.changelogVersion).toBe("1.5.0");
    });

    it("reports no drift when versions match", () => {
      const result = checkVersionDrift("1.0.0", "## 1.0.0\n\n- Initial release\n");
      expect(result.drifted).toBe(false);
    });

    it("matches Keep a Changelog bracket format: ## [1.0.0]", () => {
      const result = checkVersionDrift("1.0.0", "## [1.0.0] - 2026-01-01\n\n- Initial release\n");
      expect(result.drifted).toBe(false);
      expect(result.changelogVersion).toBe("1.0.0");
    });

    it("detects mismatch in bracket format", () => {
      const result = checkVersionDrift("2.0.0", "## [1.5.0] - 2026-01-01\n");
      expect(result.drifted).toBe(true);
      expect(result.changelogVersion).toBe("1.5.0");
    });

    it("handles missing version heading in CHANGELOG", () => {
      const result = checkVersionDrift("1.0.0", "No version headings here.\n");
      expect(result.drifted).toBe(true);
      expect(result.changelogVersion).toBeNull();
    });
  });
});
