import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import type {
  SemanticEnrichmentAvailableResult,
  SemanticEnrichmentFact,
  SemanticEnrichmentProvider,
  SemanticEnrichmentProviderResult,
  SemanticEnrichmentUnavailableResult,
} from "../../../src/ports/semantic-enrichment.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { openWarp } from "../../../src/warp/open.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

describe("warp: bounded LSP semantic enrichment", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("warp-lsp-enrichment-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  function writeAndCommit(files: Record<string, string>): string {
    for (const [filePath, content] of Object.entries(files)) {
      const absolutePath = path.join(tmpDir, filePath);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, content);
    }
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");
    return git(tmpDir, "rev-parse HEAD");
  }

  function available(facts: readonly SemanticEnrichmentFact[]): SemanticEnrichmentAvailableResult {
    return { status: "available", facts };
  }

  function unavailable(reason: string): SemanticEnrichmentUnavailableResult {
    return { status: "unavailable", reason };
  }

  it("golden path: emits same-file fake-provider call edges and typeof properties for explicit paths", async () => {
    const headSha = writeAndCommit({
      "src/app.ts": [
        "export function helper(): string { return 'ready'; }",
        "export function start(): string { return helper(); }",
        "",
      ].join("\n"),
    });
    const warp = await openWarp({ cwd: tmpDir });
    const enrichFile = vi.fn((): Promise<SemanticEnrichmentProviderResult> => Promise.resolve(available([
      {
        kind: "typeof",
        symbolId: "sym:src/app.ts:start",
        typeName: "() => string",
      },
      {
        kind: "call",
        fromSymbolId: "sym:src/app.ts:start",
        toSymbolId: "sym:src/app.ts:helper",
      },
    ])));
    const provider: SemanticEnrichmentProvider = {
      enrichFile,
    };

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
      semanticProvider: provider,
    });
    await warp.core().materialize();

    expect(enrichFile).toHaveBeenCalledWith({
      repoRoot: tmpDir,
      filePath: "src/app.ts",
      language: "ts",
      content: expect.stringContaining("export function start"),
      headSha,
      maxFacts: 64,
    });
    expect(result.semanticEnrichment).toEqual({
      status: "available",
      filesAttempted: 1,
      factsAccepted: 2,
      factsRejected: 0,
      unavailable: [],
    });

    const obs = await warp.observer({ match: "sym:*" });
    const props = await obs.getNodeProps("sym:src/app.ts:start");
    const edges = await obs.getEdges();

    expect(props?.["typeof"]).toBe("() => string");
    expect(edges).toContainEqual(expect.objectContaining({
      from: "sym:src/app.ts:start",
      to: "sym:src/app.ts:helper",
      label: "calls",
    }));
  });

  it("known failure: reports not_configured when no semantic provider is present", async () => {
    writeAndCommit({
      "src/app.ts": "export function start(): void {}\n",
    });
    const warp = await openWarp({ cwd: tmpDir });

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
    });

    expect(result.filesIndexed).toBe(1);
    expect(result.semanticEnrichment).toEqual({
      status: "not_configured",
      filesAttempted: 0,
      factsAccepted: 0,
      factsRejected: 0,
      unavailable: [],
    });
  });

  it("known failure: skips semantic enrichment for non-explicit eager indexing", async () => {
    writeAndCommit({
      "src/app.ts": "export function start(): void {}\n",
    });
    const warp = await openWarp({ cwd: tmpDir });
    const enrichFile = vi.fn((): Promise<SemanticEnrichmentProviderResult> => Promise.resolve(available([])));
    const provider: SemanticEnrichmentProvider = { enrichFile };

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      semanticProvider: provider,
    });

    expect(enrichFile).not.toHaveBeenCalled();
    expect(result.filesIndexed).toBe(1);
    expect(result.semanticEnrichment).toEqual({
      status: "skipped_not_explicit",
      filesAttempted: 0,
      factsAccepted: 0,
      factsRejected: 0,
      unavailable: [],
    });
  });

  it("known failure: keeps tree-sitter indexing successful when the semantic provider is unavailable", async () => {
    writeAndCommit({
      "src/app.ts": "export function start(): void {}\n",
    });
    const warp = await openWarp({ cwd: tmpDir });
    const provider: SemanticEnrichmentProvider = {
      enrichFile: vi.fn(() => Promise.resolve(unavailable("typescript language server unavailable"))),
    };

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
      semanticProvider: provider,
    });
    await warp.core().materialize();

    expect(result.filesIndexed).toBe(1);
    expect(result.semanticEnrichment).toEqual({
      status: "unavailable",
      filesAttempted: 1,
      factsAccepted: 0,
      factsRejected: 0,
      unavailable: [{
        filePath: "src/app.ts",
        reason: "typescript language server unavailable",
      }],
    });

    const obs = await warp.observer({ match: "file:*" });
    expect(await obs.getNodes()).toContain("file:src/app.ts");
  });

  it("known failure: converts provider throws into unavailable enrichment without failing indexing", async () => {
    writeAndCommit({
      "src/app.ts": "export function start(): void {}\n",
    });
    const warp = await openWarp({ cwd: tmpDir });
    const provider: SemanticEnrichmentProvider = {
      enrichFile: vi.fn(() => {
        throw new Error("tsserver crashed");
      }),
    };

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
      semanticProvider: provider,
    });
    await warp.core().materialize();

    expect(result.filesIndexed).toBe(1);
    expect(result.semanticEnrichment).toEqual({
      status: "unavailable",
      filesAttempted: 1,
      factsAccepted: 0,
      factsRejected: 0,
      unavailable: [{
        filePath: "src/app.ts",
        reason: "semantic provider failed: tsserver crashed",
      }],
    });
  });

  it("edge case: rejects unanchored and cross-file semantic facts instead of inventing graph nodes", async () => {
    writeAndCommit({
      "src/app.ts": [
        "export function helper(): string { return 'ready'; }",
        "export function start(): string { return helper(); }",
        "",
      ].join("\n"),
      "src/other.ts": "export function outside(): void {}\n",
    });
    const warp = await openWarp({ cwd: tmpDir });
    const provider: SemanticEnrichmentProvider = {
      enrichFile: vi.fn(() => Promise.resolve(available([
        {
          kind: "typeof",
          symbolId: "sym:src/app.ts:missing",
          typeName: "() => void",
        },
        {
          kind: "call",
          fromSymbolId: "sym:src/app.ts:start",
          toSymbolId: "sym:src/other.ts:outside",
        },
        {
          kind: "call",
          fromSymbolId: "sym:src/app.ts:helper",
          toSymbolId: "sym:src/app.ts:start",
        },
      ]))),
    };

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
      semanticProvider: provider,
    });
    await warp.core().materialize();

    expect(result.semanticEnrichment).toEqual({
      status: "available",
      filesAttempted: 1,
      factsAccepted: 1,
      factsRejected: 2,
      unavailable: [],
    });

    const obs = await warp.observer({ match: "sym:*" });
    const nodes = await obs.getNodes();
    const edges = await obs.getEdges();
    expect(nodes).not.toContain("sym:src/app.ts:missing");
    expect(edges).not.toContainEqual(expect.objectContaining({
      from: "sym:src/app.ts:start",
      to: "sym:src/other.ts:outside",
      label: "calls",
    }));
    expect(edges).toContainEqual(expect.objectContaining({
      from: "sym:src/app.ts:helper",
      to: "sym:src/app.ts:start",
      label: "calls",
    }));
  });

  it("stress: applies the per-file semantic fact cap before writing semantic facts", async () => {
    const source = Array.from({ length: 70 }, (_, index) => `export function fn${String(index)}(): void {}`).join("\n");
    writeAndCommit({
      "src/app.ts": `${source}\n`,
    });
    const warp = await openWarp({ cwd: tmpDir });
    const facts: SemanticEnrichmentFact[] = Array.from({ length: 70 }, (_, index) => ({
      kind: "typeof",
      symbolId: `sym:src/app.ts:fn${String(index)}`,
      typeName: "() => void",
    }));
    const enrichFile = vi.fn((): Promise<SemanticEnrichmentProviderResult> => Promise.resolve(available(facts)));
    const provider: SemanticEnrichmentProvider = { enrichFile };

    const result = await indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
      semanticProvider: provider,
      semanticFactLimit: 64,
    });
    await warp.core().materialize();

    expect(enrichFile).toHaveBeenCalledWith(expect.objectContaining({
      maxFacts: 64,
    }));
    expect(result.semanticEnrichment).toEqual({
      status: "available",
      filesAttempted: 1,
      factsAccepted: 64,
      factsRejected: 6,
      unavailable: [],
    });

    const obs = await warp.observer({ match: "sym:*" });
    expect((await obs.getNodeProps("sym:src/app.ts:fn63"))?.["typeof"]).toBe("() => void");
    expect((await obs.getNodeProps("sym:src/app.ts:fn64"))?.["typeof"]).toBeUndefined();
  });

  it("stress: still applies maxPatchJsonBytes to provider-supplied semantic facts", async () => {
    writeAndCommit({
      "src/app.ts": "export function start(): void {}\n",
    });
    const warp = await openWarp({ cwd: tmpDir });
    const provider: SemanticEnrichmentProvider = {
      enrichFile: vi.fn(() => Promise.resolve(available([{
        kind: "typeof",
        symbolId: "sym:src/app.ts:start",
        typeName: "x".repeat(100_000),
      }]))),
    };

    await expect(indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      paths: ["src/app.ts"],
      semanticProvider: provider,
      maxPatchJsonBytes: 50_000,
    })).rejects.toThrow("estimated patch payload");
  });
});
