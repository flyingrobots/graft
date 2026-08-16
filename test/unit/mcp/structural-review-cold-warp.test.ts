import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";
import { structuralReviewTool } from "../../../src/mcp/tools/structural-review.js";
import { nodeFs } from "../../../src/adapters/node-fs.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import type { ToolContext } from "../../../src/mcp/context.js";
import type { StructuralReadingPort } from "../../../src/ports/structural-reading.js";

describe("mcp: graft_review cold WARP", () => {
  it("reuses one structural-reading port across every breaking symbol", async () => {
    const repoDir = createTestRepo("graft-review-shared-reading-port-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "src", "api.ts"), [
        "export function first(input: string): string { return input; }",
        "export function second(input: string): string { return input; }",
        "",
      ].join("\n"));
      git(repoDir, "add -A"); git(repoDir, "commit -m base");
      const base = git(repoDir, "rev-parse HEAD");
      fs.writeFileSync(path.join(repoDir, "src", "api.ts"), [
        "export function first(input: number): string { return String(input); }",
        "export function second(input: number): string { return String(input); }",
        "",
      ].join("\n"));
      git(repoDir, "add -A"); git(repoDir, "commit -m head");
      const head = git(repoDir, "rev-parse HEAD");

      const countSymbolReferences = vi.fn((request) => Promise.resolve({
          kind: "symbol-reference-count" as const,
          freshness: "current" as const,
          residualPosture: "complete" as const,
          payload: { symbol: request.symbolName, referenceCount: 0, referencingFiles: [] },
          evidence: {
            kind: "translated-substrate" as const,
            evidenceLabel: "fallback-translated" as const,
            substrate: "git-warp" as const,
            basis: { kind: "git-committed-history" as const, projectRoot: repoDir, ref: head },
            evidence: { kind: "symbol-reference-count" as const, source: "committed-reference-scan" as const, symbolName: request.symbolName, filePath: request.filePath },
            nativeContinuumWitness: false as const,
          },
        }));
      const port = { countSymbolReferences } as unknown as StructuralReadingPort;
      const getStructuralReadingPort = vi.fn(() => port);

      await structuralReviewTool.createHandler()({ base, head }, {
        projectRoot: repoDir,
        fs: nodeFs,
        git: nodeGit,
        resolvePath: (filePath: string) => path.join(repoDir, filePath),
        getStructuralReadingPort,
        getWarp: () => Promise.reject(new Error("review bypassed the structural-reading port")),
        recordFootprint: () => undefined,
        respond: (_tool: string, payload: Record<string, unknown>) => payload,
      } as unknown as ToolContext);

      expect(countSymbolReferences).toHaveBeenCalledTimes(2);
      expect(getStructuralReadingPort).toHaveBeenCalledOnce();
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("routes impact counts through the configured structural-reading port", async () => {
    const repoDir = createTestRepo("graft-review-reading-port-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "src", "api.ts"), "export function buildThing(input: string): string { return input; }\n");
      git(repoDir, "add -A"); git(repoDir, "commit -m base");
      const base = git(repoDir, "rev-parse HEAD");
      fs.writeFileSync(path.join(repoDir, "src", "api.ts"), "export function buildThing(input: number): string { return String(input); }\n");
      git(repoDir, "add -A"); git(repoDir, "commit -m head");
      const head = git(repoDir, "rev-parse HEAD");
      const countSymbolReferences = vi.fn(() => Promise.resolve({
        kind: "symbol-reference-count" as const,
        freshness: "current" as const,
        residualPosture: "complete" as const,
        payload: { symbol: "buildThing", referenceCount: 7, referencingFiles: ["src/consumer.ts"] },
        evidence: {
          kind: "translated-substrate" as const,
          evidenceLabel: "fallback-translated" as const,
          substrate: "git-warp" as const,
          basis: { kind: "git-committed-history" as const, projectRoot: repoDir, ref: head },
          evidence: { kind: "symbol-reference-count" as const, source: "committed-reference-scan" as const, symbolName: "buildThing", filePath: "src/api.ts" },
          nativeContinuumWitness: false as const,
        },
      }));
      const port = { countSymbolReferences } as unknown as StructuralReadingPort;
      const result = await structuralReviewTool.createHandler()({ base, head }, {
        projectRoot: repoDir,
        fs: nodeFs,
        git: nodeGit,
        resolvePath: (filePath: string) => path.join(repoDir, filePath),
        getStructuralReadingPort: () => port,
        getWarp: () => Promise.reject(new Error("review bypassed the structural-reading port")),
        recordFootprint: () => undefined,
        respond: (_tool: string, payload: Record<string, unknown>) => payload,
      } as unknown as ToolContext) as unknown as Record<string, unknown>;

      expect(countSymbolReferences).toHaveBeenCalledWith(expect.objectContaining({
        symbolName: "buildThing", filePath: "src/api.ts", ref: head,
      }));
      expect(result["breakingChanges"]).toContainEqual(expect.objectContaining({ impactedFiles: 7 }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("preserves breaking-change impact counts without a pre-indexed WARP graph", async () => {
    const repoDir = createTestRepo("graft-review-cold-warp-");
    try {
      fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
      fs.writeFileSync(
        path.join(repoDir, "src", "api.ts"),
        "export function buildThing(input: string): string { return input; }\n",
      );
      fs.writeFileSync(
        path.join(repoDir, "src", "consumer.ts"),
        [
          "import { buildThing } from \"./api\";",
          "export const value = buildThing(\"x\");",
          "",
        ].join("\n"),
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m base");
      const base = git(repoDir, "rev-parse HEAD");

      fs.writeFileSync(
        path.join(repoDir, "src", "api.ts"),
        [
          "export function buildThing(",
          "  input: string,",
          "  opts: { trim: boolean },",
          "): string {",
          "  return opts.trim ? input.trim() : input;",
          "}",
          "",
        ].join("\n"),
      );
      git(repoDir, "add -A");
      git(repoDir, "commit -m head");
      const head = git(repoDir, "rev-parse HEAD");

      const server = createServerInRepo(repoDir);
      const result = parse(await server.callTool("graft_review", { base, head }));

      expect(result["breakingChanges"]).toContainEqual(expect.objectContaining({
        symbol: "buildThing",
        changeType: "signature_changed",
        impactedFiles: 1,
        impactedFilePaths: ["src/consumer.ts"],
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("finds a qualified Python caller and reports shadowed callers as partial", async () => {
    const repoDir = createTestRepo("graft-review-python-cold-");
    try {
      fs.mkdirSync(path.join(repoDir, "app", "alpha"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "app", "alpha", "sources.py"), "def pending_ids(items):\n    return []\n");
      fs.writeFileSync(path.join(repoDir, "app", "alpha", "cli.py"), [
        "from app.alpha import sources",
        "sources.pending_ids([])",
        "def uncertain(sources):",
        "    return sources.pending_ids([])",
      ].join("\n"));
      git(repoDir, "add -A"); git(repoDir, "commit -m base");
      const base = git(repoDir, "rev-parse HEAD");
      fs.writeFileSync(path.join(repoDir, "app", "alpha", "sources.py"), "def pending_ids(items, root):\n    return []\n");
      git(repoDir, "add -A"); git(repoDir, "commit -m head");
      const head = git(repoDir, "rev-parse HEAD");

      const result = parse(await createServerInRepo(repoDir).callTool("graft_review", { base, head }));
      expect(result["breakingChanges"]).toContainEqual(expect.objectContaining({
        symbol: "pending_ids",
        impactedFiles: 1,
        impactedFilePaths: ["app/alpha/cli.py"],
        referenceConfidence: "partial",
        referenceWarnings: [expect.objectContaining({
          code: "import_binding_shadowed",
          filePath: "app/alpha/cli.py",
          binding: "sources",
          targetFilePath: "app/alpha/sources.py",
        })],
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("counts qualified callers of a declaring file deleted at the reviewed head", async () => {
    const repoDir = createTestRepo("graft-review-deleted-target-");
    try {
      fs.mkdirSync(path.join(repoDir, "pkg"), { recursive: true });
      fs.writeFileSync(path.join(repoDir, "pkg", "sources.py"), "def pending_ids():\n    return []\n");
      fs.writeFileSync(path.join(repoDir, "pkg", "caller.py"), "import pkg.sources as source\nsource.pending_ids()\n");
      git(repoDir, "add -A"); git(repoDir, "commit -m base");
      const base = git(repoDir, "rev-parse HEAD");
      fs.unlinkSync(path.join(repoDir, "pkg", "sources.py"));
      git(repoDir, "add -A"); git(repoDir, "commit -m head");
      const head = git(repoDir, "rev-parse HEAD");

      const result = parse(await createServerInRepo(repoDir).callTool("graft_review", { base, head }));

      expect(result["breakingChanges"]).toContainEqual(expect.objectContaining({
        symbol: "pending_ids",
        filePath: "pkg/sources.py",
        changeType: "removed_export",
        impactedFiles: 1,
        impactedFilePaths: ["pkg/caller.py"],
        referenceConfidence: "complete",
      }));
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
