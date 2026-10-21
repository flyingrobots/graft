import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { createGitWarpStructuralReadingPort } from "../../../src/warp/structural-reading-adapter.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

// Completeness of a dead-symbol reading is relative to a declared domain: the
// files tracked at HEAD that the index parses. Files outside it (here,
// README.md) are deliberately excluded and do not make the reading partial.
// Domain files the index has not covered at HEAD are missing coverage and do.
describe("warp: dead-symbol reading coverage", { timeout: 20000 }, () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = createTestRepo("graft-dead-sym-coverage-");
  });

  afterEach(async () => {
    await cleanupTestRepo(repoDir);
  });

  function write(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(path.join(repoDir, filePath)), { recursive: true });
    fs.writeFileSync(path.join(repoDir, filePath), content);
  }

  function commit(message: string): string {
    git(repoDir, "add -A");
    git(repoDir, `commit -m '${message}'`);
    return git(repoDir, "rev-parse HEAD").trim();
  }

  async function openCtx(): Promise<WarpContext> {
    return { app: await openWarp({ cwd: repoDir }), strandId: null };
  }

  async function index(ctx: WarpContext, paths?: readonly string[]): Promise<void> {
    await indexHead({ cwd: repoDir, git: nodeGit, pathOps: nodePathOps, ctx, paths });
  }

  function portFor(ctx: WarpContext) {
    return createGitWarpStructuralReadingPort({
      projectRoot: repoDir,
      git: nodeGit,
      pathOps: nodePathOps,
      getWarp: () => Promise.resolve(ctx),
    });
  }

  function seedThreeFiles(): string {
    write("src/a.ts", "export function alpha(): number { return 1; }\n");
    write("src/b.ts", "export function beta(): number { return 2; }\n");
    write("README.md", "# fixture\n");
    return commit("seed");
  }

  it("reports partial and names the unindexed file when the index is partial", async () => {
    const head = seedThreeFiles();
    const ctx = await openCtx();
    await index(ctx, ["src/a.ts"]);

    const reading = await portFor(ctx).findDeadSymbols();

    expect(reading.residualPosture).toBe("partial");
    expect(reading.payload.currentTreeCoverage).toEqual({
      basisCommit: head,
      domain: "indexable-files-at-basis",
      domainFiles: 2,
      coveredFiles: 1,
      excluded: [{ reason: "unsupported-language", files: 1 }],
      missingFiles: 1,
      missing: [{ path: "src/b.ts", reason: "not-indexed" }],
    });
  });

  it("reports complete when every domain file is indexed, with excluded files counted", async () => {
    seedThreeFiles();
    const ctx = await openCtx();
    await index(ctx);

    const reading = await portFor(ctx).findDeadSymbols();

    expect(reading.residualPosture).toBe("complete");
    expect(reading.payload.currentTreeCoverage).toMatchObject({
      domainFiles: 2,
      coveredFiles: 2,
      excluded: [{ reason: "unsupported-language", files: 1 }],
      missingFiles: 0,
      missing: [],
    });
  });

  it("counts a file indexed at an older commit as covered only while its content is unchanged", async () => {
    write("src/c.ts", "export function gamma(): number { return 3; }\n");
    seedThreeFiles();
    const ctx = await openCtx();
    await index(ctx);

    write("src/a.ts", "export function alpha(): number { return 10; }\n");
    write("src/b.ts", "export function beta(): number { return 20; }\n");
    commit("edit a and b");
    await index(ctx, ["src/a.ts"]);

    const reading = await portFor(ctx).findDeadSymbols();

    expect(reading.residualPosture).toBe("partial");
    expect(reading.payload.currentTreeCoverage).toMatchObject({
      domainFiles: 3,
      coveredFiles: 2,
      missingFiles: 1,
      missing: [{ path: "src/b.ts", reason: "indexed-content-differs" }],
    });
  });

  it("reports a deleted file the index still holds as missing coverage", async () => {
    seedThreeFiles();
    const ctx = await openCtx();
    await index(ctx);

    fs.rmSync(path.join(repoDir, "src/b.ts"));
    commit("delete b");
    await index(ctx);

    const reading = await portFor(ctx).findDeadSymbols();

    expect(reading.residualPosture).toBe("partial");
    expect(reading.payload.currentTreeCoverage).toMatchObject({
      domainFiles: 1,
      coveredFiles: 1,
      missingFiles: 1,
      missing: [{ path: "src/b.ts", reason: "deleted-since-indexed" }],
    });
  });

  it("states completeness and names uncovered files in graft_dead_symbols", async () => {
    seedThreeFiles();
    const server = createServerInRepo(repoDir);

    const result = parse(await server.callTool("graft_dead_symbols", {}));

    expect(result["residualPosture"]).toBe("partial");
    expect(result["currentTreeCoverage"]).toMatchObject({
      domainFiles: 2,
      coveredFiles: 0,
      missingFiles: 2,
      missing: [
        { path: "src/a.ts", reason: "not-indexed" },
        { path: "src/b.ts", reason: "not-indexed" },
      ],
    });
  });
});
