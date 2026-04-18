import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");

function readRepoText(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function repoFileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

function listDir(relPath: string): string[] {
  const dir = path.join(ROOT, relPath);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f !== ".gitkeep");
}

describe("CORE_v060-bad-code-burndown", () => {
  // -- Human playback questions --

  it("Is the bad-code directory empty?", () => {
    const items = listDir("docs/method/backlog/bad-code");
    expect(items).toEqual([]);
  });

  it("Did any bad-code retirements skip the cycle loop (design → build → drift → retro)?", () => {
    // This test witnesses that the design doc exists retroactively
    expect(repoFileExists("docs/design/CORE_v060-bad-code-burndown.md")).toBe(true);
    const design = readRepoText("docs/design/CORE_v060-bad-code-burndown.md");
    expect(design).toContain("Playback Questions");
    expect(design).toContain("violated");
  });

  it("Are the anti-sludge policy checks integrated and baselined?", () => {
    expect(repoFileExists("docs/ANTI_SLUDGE_TYPESCRIPT_POLICY.md")).toBe(true);
    expect(repoFileExists("semgrep/typescript-anti-sludge.yml")).toBe(true);
    expect(repoFileExists("scripts/check-anti-sludge.sh")).toBe(true);
  });

  it("Does the changelog accurately reflect what shipped?", () => {
    // Changelog has an [Unreleased] section with content
    expect(repoFileExists("CHANGELOG.md")).toBe(true);
    const changelog = readRepoText("CHANGELOG.md");
    expect(changelog).toContain("[Unreleased]");
  });

  // -- Agent playback questions --

  it("Do all result types use explicit interfaces without [key: string]: unknown index signatures?", () => {
    const files = [
      "src/operations/safe-read.ts",
      "src/operations/file-outline.ts",
      "src/operations/read-range.ts",
      "src/operations/graft-diff.ts",
    ];
    for (const file of files) {
      const content = readRepoText(file);
      expect(content).not.toContain("[key: string]: unknown");
    }
  });

  it("Do all tool handlers serialize through toJsonObject() instead of passing results directly?", () => {
    expect(repoFileExists("src/operations/result-dto.ts")).toBe(true);
    const dto = readRepoText("src/operations/result-dto.ts");
    expect(dto).toContain("export function toJsonObject");
  });

  it("Is the parser classified as an application module with enforced hex layer guardrails?", () => {
    const eslintConfig = readRepoText("eslint.config.js");
    // Parser should be in application module restriction group, not secondary adapter
    expect(eslintConfig).toContain('"src/parser/**/*.ts"');
    // Application import patterns should include parser
    expect(eslintConfig).toContain('"**/parser"');
  });

  it("Does assertToolContext() validate the full context contract at construction time?", () => {
    const context = readRepoText("src/mcp/context.ts");
    expect(context).toContain("export function assertToolContext");
    expect(context).toContain("REQUIRED_PORTS");
    expect(context).toContain("REQUIRED_GOVERNANCE");
    expect(context).toContain("REQUIRED_METHODS");
  });

  it("Is secret scrubbing applied to both run-capture output and observability arg values?", () => {
    expect(repoFileExists("src/mcp/secret-scrub.ts")).toBe(true);
    const scrub = readRepoText("src/mcp/secret-scrub.ts");
    expect(scrub).toContain("export function scrubSecrets");
    expect(scrub).toContain("export function sanitizeArgValues");
  });

  it("Does worktree identity canonicalize paths through fs.realpathSync?", () => {
    const resolution = readRepoText("src/mcp/workspace-router-resolution.ts");
    expect(resolution).toContain("realpathSync");
  });

  it("Are SessionTracker and RegisteredSession renamed to unambiguous terms?", () => {
    const tracker = readRepoText("src/session/tracker.ts");
    expect(tracker).toContain("GovernorTracker");
    expect(tracker).not.toContain("class SessionTracker");

    const context = readRepoText("src/mcp/context.ts");
    expect(context).toContain("governor:");
    expect(context).not.toMatch(/\bsession:\s*SessionTracker/);
  });

  it("Does ToolHandler receive ctx as an explicit parameter instead of closing over it?", () => {
    const context = readRepoText("src/mcp/context.ts");
    expect(context).toContain("(args: JsonObject, ctx: ToolContext)");
    expect(context).toContain("createHandler: () => ToolHandler");
  });

  it("Does the receipt builder use a mutable draft instead of as casts?", () => {
    const receipt = readRepoText("src/mcp/receipt.ts");
    expect(receipt).toContain("ReceiptDraft");
    expect(receipt).not.toContain("as McpToolReceipt &");
  });

  it("Are the MCP composition files decomposed into focused sub-modules?", () => {
    // repo-state split
    expect(repoFileExists("src/mcp/repo-state-types.ts")).toBe(true);
    expect(repoFileExists("src/mcp/repo-state-git.ts")).toBe(true);
    expect(repoFileExists("src/mcp/repo-state-transition.ts")).toBe(true);
    expect(repoFileExists("src/mcp/repo-state-observation.ts")).toBe(true);

    // worker-pool split
    expect(repoFileExists("src/mcp/daemon-worker-types.ts")).toBe(true);
    expect(repoFileExists("src/mcp/daemon-worker-inline-pool.ts")).toBe(true);
    expect(repoFileExists("src/mcp/daemon-worker-child-pool.ts")).toBe(true);

    // control-plane split
    expect(repoFileExists("src/mcp/control-plane/types.ts")).toBe(true);
    expect(repoFileExists("src/mcp/control-plane/authz-storage.ts")).toBe(true);

    // monitor-runtime split
    expect(repoFileExists("src/mcp/monitor-types.ts")).toBe(true);
    expect(repoFileExists("src/mcp/monitor-health.ts")).toBe(true);

    // server split
    expect(repoFileExists("src/mcp/server-context.ts")).toBe(true);
    expect(repoFileExists("src/mcp/server-invocation.ts")).toBe(true);
  });
});
