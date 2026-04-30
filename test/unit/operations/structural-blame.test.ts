/* eslint-disable @typescript-eslint/no-deprecated -- testing deprecated function */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { commitsForSymbol, symbolsForCommit } from "../../../src/warp/structural-queries.js";
import { countSymbolReferencesFromGraph } from "../../../src/warp/warp-reference-count.js";
import { getCommitMeta } from "../../../src/warp/commit-meta.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import {
  structuralBlame,
  type CommitMetaInput,
  type SymbolMetaInput,
} from "../../../src/operations/structural-blame.js";
import type { WarpContext } from "../../../src/warp/context.js";

function commitSha(cwd: string, ref = "HEAD"): string {
  return git(cwd, `rev-parse ${ref}`);
}

describe("operations: structural blame", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-structural-blame-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function indexRepo(): Promise<WarpContext> {
    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
    return ctx;
  }

  /**
   * Full blame pipeline: index repo, query WARP, gather git metadata,
   * then call the pure structuralBlame function.
   */
  async function runBlame(symbolName: string, warp: WarpContext, filePath?: string) {
    const history = await commitsForSymbol(warp, symbolName, filePath);

    // Get commit metadata
    const commitMeta = new Map<string, CommitMetaInput>();
    await Promise.all(
      history.commits.map(async (c) => {
        const meta = await getCommitMeta(nodeGit, c.sha, tmpDir);
        commitMeta.set(c.sha, { author: meta.author, date: meta.timestamp, message: meta.message });
      }),
    );

    // Get symbol metadata from the most recent commit
    let symbolMeta: SymbolMetaInput | undefined;
    if (history.commits.length > 0) {
      const sorted = [...history.commits].sort((a, b) => {
        const dateA = commitMeta.get(a.sha)?.date ?? "";
        const dateB = commitMeta.get(b.sha)?.date ?? "";
        return dateB.localeCompare(dateA);
      });
      const mostRecentSha = sorted[0]?.sha;
      if (mostRecentSha !== undefined) {
        const latestSyms = await symbolsForCommit(warp, mostRecentSha);
        const allSyms = [...latestSyms.added, ...latestSyms.changed];
        const match = allSyms.find((s) => s.name === symbolName);
        if (match !== undefined) {
          symbolMeta = { kind: match.kind, exported: match.exported };
        }
      }
    }

    // Get reference count
    const refs = await countSymbolReferencesFromGraph(warp, symbolName, history.filePath);

    return structuralBlame({
      symbolName,
      filePath: history.filePath,
      commits: history.commits,
      commitMeta,
      symbolMeta,
      referenceCount: refs.referenceCount,
      referencingFiles: refs.referencingFiles,
    });
  }

  it("returns creation commit for a newly added function", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      "export function add(a: number, b: number): number { return a + b; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math function'");

    const sha = commitSha(tmpDir);
    const warp = await indexRepo();
    const result = await runBlame("add", warp);

    expect(result.symbol).toBe("add");
    expect(result.kind).toBe("function");
    expect(result.exported).toBe(true);
    expect(result.changeCount).toBe(1);
    expect(result.created).toBeDefined();
    expect(result.created?.sha).toBe(sha);
    expect(result.created?.message).toBe("add math function");
    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.changeKind).toBe("added");
    expect(result.history[0]?.sha).toBe(sha);
  });

  it("detects last signature change across commits", async () => {
    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };

    // Commit 1: original function
    fs.writeFileSync(
      path.join(tmpDir, "greet.ts"),
      "export function greet(name: string): string { return name; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");
    const creationSha = commitSha(tmpDir);
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });

    // Commit 2: change signature
    fs.writeFileSync(
      path.join(tmpDir, "greet.ts"),
      "export function greet(name: string, greeting: string): string { return `${greeting} ${name}`; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greeting param'");
    const changeSha = commitSha(tmpDir);
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
    const result = await runBlame("greet", ctx);

    expect(result.symbol).toBe("greet");
    expect(result.changeCount).toBe(2);

    // Creation should point to first commit
    expect(result.created).toBeDefined();
    expect(result.created?.sha).toBe(creationSha);
    expect(result.created?.message).toBe("add greet");

    // Last signature change should point to second commit
    expect(result.lastSignatureChange).toBeDefined();
    expect(result.lastSignatureChange?.sha).toBe(changeSha);
    expect(result.lastSignatureChange?.message).toBe("add greeting param");

    // History should have both entries
    expect(result.history).toHaveLength(2);
  });

  it("returns reference count for a symbol", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "util.ts"),
      "export function helper(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "consumer.ts"),
      'import { helper } from "./util.js";\nhelper();\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add helper and consumer'");

    const warp = await indexRepo();
    const result = await runBlame("helper", warp, "util.ts");

    expect(result.symbol).toBe("helper");
    expect(result.referenceCount).toBeGreaterThan(0);
    expect(result.referencingFiles.length).toBeGreaterThan(0);
  });

  it("returns empty result for unknown symbol", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export const x = 1;\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add x'");

    const warp = await indexRepo();
    const result = await runBlame("nonexistent", warp);

    expect(result.symbol).toBe("nonexistent");
    expect(result.changeCount).toBe(0);
    expect(result.history).toHaveLength(0);
    expect(result.created).toBeUndefined();
    expect(result.lastSignatureChange).toBeUndefined();
  });

  it("filters by file path when provided", async () => {
    // Same symbol name in two files
    fs.writeFileSync(
      path.join(tmpDir, "a.ts"),
      "export function shared(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "b.ts"),
      "export function shared(): string { return ''; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add shared in two files'");

    const warp = await indexRepo();
    const result = await runBlame("shared", warp, "a.ts");

    expect(result.symbol).toBe("shared");
    expect(result.filePath).toBe("a.ts");
    expect(result.changeCount).toBe(1);
  });
});
