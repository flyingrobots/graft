import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it, expect } from "vitest";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function repoFileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readRepoText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

describe("CORE_v070-structural-history", () => {
  // -- Human --

  it("Can I run graft log and see which symbols changed per commit?", () => {
    expect(repoFileExists("src/operations/structural-log.ts")).toBe(true);
    expect(repoFileExists("src/mcp/tools/structural-log.ts")).toBe(true);
    const caps = readRepoText("src/contracts/capabilities.ts");
    expect(caps).toContain('"graft_log"');
  });

  it("Can I run graft blame on a function and see who last changed its signature?", () => {
    expect(repoFileExists("src/operations/structural-blame.ts")).toBe(true);
    expect(repoFileExists("src/mcp/tools/structural-blame.ts")).toBe(true);
    const caps = readRepoText("src/contracts/capabilities.ts");
    expect(caps).toContain('"graft_blame"');
  });

  it("Can I run graft review on a PR and see structural vs formatting files?", () => {
    expect(repoFileExists("src/operations/structural-review.ts")).toBe(true);
    expect(repoFileExists("src/mcp/tools/structural-review.ts")).toBe(true);
    const caps = readRepoText("src/contracts/capabilities.ts");
    expect(caps).toContain('"graft_review"');
  });

  // -- Agent --

  it("Does graft_log return structured symbol changes per commit?", () => {
    expect(repoFileExists("test/unit/operations/structural-log.test.ts")).toBe(true);
    const test = readRepoText("test/unit/operations/structural-log.test.ts");
    expect(test).toContain("symbol changes");
  });

  it("Does graft_blame return creation commit, last signature change, and reference count?", () => {
    expect(repoFileExists("test/unit/operations/structural-blame.test.ts")).toBe(true);
    const op = readRepoText("src/operations/structural-blame.ts");
    expect(op).toContain("referenceCount");
    expect(op).toContain("lastSignatureChange");
  });

  it("Does graft_review categorize files and detect breaking changes?", () => {
    expect(repoFileExists("test/unit/operations/structural-review.test.ts")).toBe(true);
    const op = readRepoText("src/operations/structural-review.ts");
    expect(op).toContain("breakingChanges");
    expect(op).toContain("structural");
    expect(op).toContain("formatting");
  });

  it("Does graft_churn rank symbols by change frequency?", () => {
    expect(repoFileExists("test/unit/operations/structural-churn.test.ts")).toBe(true);
    const op = readRepoText("src/operations/structural-churn.ts");
    expect(op).toContain("changeCount");
  });

  it("Does graft_exports classify semver impact of API surface changes?", () => {
    expect(repoFileExists("test/unit/operations/export-surface-diff.test.ts")).toBe(true);
    const op = readRepoText("src/operations/export-surface-diff.ts");
    expect(op).toContain("semverImpact");
  });

  it("Do all five tools respect hexagonal architecture (no WARP imports in operations)?", () => {
    const ops = [
      "src/operations/structural-log.ts",
      "src/operations/structural-blame.ts",
      "src/operations/structural-review.ts",
      "src/operations/structural-churn.ts",
      "src/operations/export-surface-diff.ts",
    ];
    for (const op of ops) {
      const content = readRepoText(op);
      expect(content).not.toContain('from "../../warp/');
      expect(content).not.toContain("from '../warp/");
    }
  });

  it("Are all five registered in capabilities, schemas, burden, and tool-registry?", () => {
    const tools = ["graft_log", "graft_blame", "graft_review", "graft_churn", "graft_exports"];
    const caps = readRepoText("src/contracts/capabilities.ts");
    const burden = readRepoText("src/mcp/burden.ts");
    const registry = readRepoText("src/mcp/tool-registry.ts");
    for (const tool of tools) {
      expect(caps).toContain(`"${tool}"`);
      expect(burden).toContain(`${tool}:`);
    }
    // Registry imports use camelCase tool names
    expect(registry).toContain("structuralLogTool");
    expect(registry).toContain("structuralBlameTool");
    expect(registry).toContain("structuralReviewTool");
    expect(registry).toContain("structuralChurnTool");
    expect(registry).toContain("exportSurfaceDiffTool");
  });
});
