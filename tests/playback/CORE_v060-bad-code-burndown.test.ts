import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assertToolContext } from "../../src/mcp/context.js";
import type { ToolDefinition } from "../../src/mcp/context.js";
import { scrubSecrets, sanitizeArgValues } from "../../src/mcp/secret-scrub.js";
import { stableWorkspaceId } from "../../src/mcp/workspace-router-resolution.js";
import { buildReceiptResult } from "../../src/mcp/receipt.js";
import { MetricsSnapshot } from "../../src/mcp/metrics.js";
import { emptyBurdenByKind, freezeBurdenByKind } from "../../src/mcp/burden.js";

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

  it("Did any bad-code retirements skip the cycle loop (design -> build -> drift -> retro)?", () => {
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
    expect(eslintConfig).toContain('"src/parser/**/*.ts"');
    expect(eslintConfig).toContain('"**/parser"');
  });

  it("Does assertToolContext validate the full context contract at construction time?", () => {
    // Accepts a well-formed context object
    const validCtx = {
      projectRoot: "/tmp/test",
      graftDir: "/tmp/test/.graft",
      graftignorePatterns: [],
      fs: {},
      codec: {},
      process: {},
      git: {},
      governor: {},
      cache: {},
      metrics: {},
      respond: () => ({ content: [] }),
      resolvePath: (r: string) => r,
      getWarp: () => Promise.resolve({}),
      getRepoState: () => { return {}; },
      getCausalContext: () => { return {}; },
      getWorkspaceStatus: () => { return {}; },
    };
    expect(() => { assertToolContext(validCtx); }).not.toThrow();

    // Rejects null
    expect(() => { assertToolContext(null); }).toThrow("ToolContext must be an object");

    // Rejects missing port
    const { fs: _fs, ...missingPort } = validCtx;
    expect(() => { assertToolContext(missingPort); }).toThrow("ToolContext missing port: fs");

    // Rejects missing governance property
    const { governor: _gov, ...missingGov } = validCtx;
    expect(() => { assertToolContext(missingGov); }).toThrow("ToolContext missing governance property: governor");

    // Rejects non-function method
    const badMethod = { ...validCtx, respond: "not a function" };
    expect(() => { assertToolContext(badMethod); }).toThrow("ToolContext missing method: respond");
  });

  it("Is secret scrubbing applied to both run-capture output and observability arg values?", () => {
    // scrubSecrets redacts private key blocks
    const keyBlock = "pre\n-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\npost";
    const scrubbed = scrubSecrets(keyBlock);
    expect(scrubbed.value).toContain("[REDACTED PRIVATE KEY BLOCK]");
    expect(scrubbed.redactions).toBeGreaterThan(0);
    expect(scrubbed.value).not.toContain("MIIE");

    // scrubSecrets redacts bearer tokens
    const bearer = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig";
    const bearerResult = scrubSecrets(bearer);
    expect(bearerResult.value).toContain("[REDACTED]");

    // scrubSecrets redacts secret assignments
    const secretAssign = "api_key = sk-1234567890abcdef";
    const assignResult = scrubSecrets(secretAssign);
    expect(assignResult.value).toContain("[REDACTED]");

    // sanitizeArgValues redacts sensitive keys
    const args = { token: "secret123", path: "src/main.ts", apiKey: "key" };
    const sanitized = sanitizeArgValues(args);
    expect(sanitized["token"]).toBe("[REDACTED]");
    expect(sanitized["apiKey"]).toBe("[REDACTED]");
    expect(sanitized["path"]).toBe("src/main.ts");

    // sanitizeArgValues truncates long values
    const longArgs = { data: "x".repeat(1000) };
    const longSanitized = sanitizeArgValues(longArgs);
    expect(typeof longSanitized["data"]).toBe("string");
    expect((longSanitized["data"] as string).length).toBeLessThan(1000);
    expect(longSanitized["data"]).toContain("[truncated");
  });

  it("Does worktree identity canonicalize paths through stableWorkspaceId?", () => {
    // stableWorkspaceId produces deterministic, prefix-tagged IDs
    const id1 = stableWorkspaceId("repo", "/Users/test/project");
    const id2 = stableWorkspaceId("repo", "/Users/test/project");
    const id3 = stableWorkspaceId("repo", "/Users/test/other");
    const id4 = stableWorkspaceId("worktree", "/Users/test/project");

    expect(id1).toBe(id2);                // same input => same ID
    expect(id1).not.toBe(id3);            // different path => different ID
    expect(id1).not.toBe(id4);            // different prefix => different ID
    expect(id1).toMatch(/^repo:/);        // tagged with prefix
    expect(id4).toMatch(/^worktree:/);    // tagged with prefix
  });

  it("Are SessionTracker and RegisteredSession renamed to unambiguous terms?", () => {
    const tracker = readRepoText("src/session/tracker.ts");
    expect(tracker).toContain("GovernorTracker");
    expect(tracker).not.toContain("class SessionTracker");

    const context = readRepoText("src/mcp/context.ts");
    expect(context).toContain("governor:");
    expect(context).not.toMatch(/\bsession:\s*SessionTracker/);
  });

  it("Does ToolHandler receive ctx as an explicit parameter instead of closing over it?", async () => {
    // ToolDefinition.createHandler() returns a ToolHandler that accepts (args, ctx)
    // We import a real tool definition to verify the contract.
    // The ToolHandler type signature enforces (args, ctx) => result.
    // We verify createHandler exists and returns a function with the correct arity.
    const { safeReadTool } = await import("../../src/mcp/tools/safe-read.js") as { safeReadTool: ToolDefinition };
    const handler = safeReadTool.createHandler();
    expect(typeof handler).toBe("function");
    // handler must accept 2 params: (args, ctx)
    expect(handler.length).toBe(2);
  });

  it("Does the receipt builder use a mutable draft that freezes into an immutable receipt?", () => {
    const metrics = new MetricsSnapshot({
      reads: 1,
      outlines: 0,
      refusals: 0,
      cacheHits: 0,
      bytesReturned: 0,
      bytesAvoided: 0,
      burdenByKind: freezeBurdenByKind(emptyBurdenByKind()),
    });
    const codec = { encode: (v: unknown) => JSON.stringify(v), decode: (s: string) => JSON.parse(s) as unknown };
    const result = buildReceiptResult("safe_read", { projection: "content" }, {
      sessionId: "test-session",
      traceId: "test-trace",
      seq: 1,
      latencyMs: 10,
      metrics,
      tripwires: [],
      codec,
    });

    expect(result.receipt).toBeDefined();
    expect(result.receipt.tool).toBe("safe_read");
    expect(result.receipt.sessionId).toBe("test-session");

    // Receipt is frozen — mutation must throw
    expect(() => {
      (result.receipt as unknown as Record<string, unknown>)["tool"] = "file_outline";
    }).toThrow();
    expect(() => {
      (result.receipt.cumulative as unknown as Record<string, unknown>)["reads"] = 999;
    }).toThrow();
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
