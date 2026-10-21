import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import {
  CLI_COMMAND_NAMES,
  MCP_TOOL_NAMES,
  getCliOutputSchemaMeta,
  getMcpOutputSchema,
  getMcpOutputSchemaMeta,
} from "../../../src/contracts/output-schemas.js";
import { cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { createGitWarpStructuralReadingPort } from "../../../src/warp/structural-reading-adapter.js";
import type { WarpContext } from "../../../src/warp/context.js";
import { createServerInRepo, parse } from "../../helpers/mcp.js";

// Oracle: dead symbols are derived from symbol sets observed at indexed
// commit boundaries. The answer must describe that history: which boundaries
// it compared, that changes between two observations are not seen, and that
// a removal is located only between the last boundary where the symbol was
// present and the first where it was absent. It must not name a commit as
// the one that removed a symbol when no observation was made at it.
describe("warp: dead-symbol history terms", { timeout: 20000 }, () => {
  let repoDir: string;

  beforeEach(() => {
    repoDir = createTestRepo("graft-dead-sym-history-");
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

  async function index(ctx: WarpContext): Promise<void> {
    await indexHead({ cwd: repoDir, git: nodeGit, pathOps: nodePathOps, ctx });
  }

  function portFor(ctx: WarpContext) {
    return createGitWarpStructuralReadingPort({
      projectRoot: repoDir,
      git: nodeGit,
      pathOps: nodePathOps,
      getWarp: () => Promise.resolve(ctx),
    });
  }

  it("locates a removal between observed boundaries instead of naming the removing commit", async () => {
    write("src/a.ts", "export function keep(): number { return 1; }\nexport function drop(): number { return 2; }\n");
    write("src/b.ts", "export const other = 1;\n");
    const observedPresent = commit("seed");
    const ctx = await openCtx();
    await index(ctx);

    write("src/a.ts", "export function keep(): number { return 1; }\n");
    const actualRemoval = commit("remove drop (not indexed)");
    write("src/b.ts", "export const other = 2;\n");
    const observedAbsent = commit("touch b");
    await index(ctx);

    const reading = await portFor(ctx).findDeadSymbols();

    expect(reading.payload.symbols).toEqual([
      expect.objectContaining({
        name: "drop",
        filePath: "src/a.ts",
        lastObservedPresentAt: observedPresent,
        firstObservedAbsentAt: observedAbsent,
      }),
    ]);
    expect(reading.payload.symbols[0]).not.toHaveProperty("removedInCommit");
    expect(observedAbsent).not.toBe(actualRemoval);
    expect(reading.payload.history).toEqual({
      domain: "observed-index-history",
      indexedBoundaries: 2,
      examinedBoundaries: 2,
      earliestExamined: observedPresent,
      latestExamined: observedAbsent,
      limitedByMaxCommits: false,
      unobserved: ["changes-between-boundaries", "history-before-earliest-boundary"],
    });
    expect(reading.payload.currentTreeCoverage).toMatchObject({ missingFiles: 0 });
    expect(reading.payload).not.toHaveProperty("coverage");
  });

  it("states that a symbol added and removed between two observations is outside what it saw", async () => {
    write("src/a.ts", "export function keep(): number { return 1; }\n");
    const first = commit("seed");
    const ctx = await openCtx();
    await index(ctx);

    write("src/a.ts", "export function keep(): number { return 1; }\nexport function brief(): number { return 3; }\n");
    commit("add brief (not indexed)");
    write("src/a.ts", "export function keep(): number { return 1; }\n");
    const last = commit("remove brief (not indexed)");
    await index(ctx);

    const reading = await portFor(ctx).findDeadSymbols();

    // Every current file is indexed, yet the removal of `brief` was never
    // observed. The current-tree coverage is complete; the history terms say
    // what the answer did not see.
    expect(reading.payload.symbols).toEqual([]);
    expect(reading.payload.currentTreeCoverage).toMatchObject({ missingFiles: 0 });
    expect(reading.payload.history).toMatchObject({
      domain: "observed-index-history",
      earliestExamined: first,
      latestExamined: last,
      unobserved: expect.arrayContaining(["changes-between-boundaries"]) as unknown,
    });
  });

  it("reports when maxCommits narrows the examined history", async () => {
    write("src/a.ts", "export const a = 1;\n");
    commit("one");
    const ctx = await openCtx();
    await index(ctx);
    write("src/a.ts", "export const a = 2;\n");
    const second = commit("two");
    await index(ctx);
    write("src/a.ts", "export const a = 3;\n");
    const third = commit("three");
    await index(ctx);

    const reading = await portFor(ctx).findDeadSymbols({ maxCommits: 1 });

    expect(reading.payload.history).toEqual({
      domain: "observed-index-history",
      indexedBoundaries: 3,
      examinedBoundaries: 2,
      earliestExamined: second,
      latestExamined: third,
      limitedByMaxCommits: true,
      unobserved: ["changes-between-boundaries", "history-before-earliest-boundary"],
    });
  });

  it("emits graft_dead_symbols under the validator its advertised version names", async () => {
    write("src/a.ts", "export const a = 1;\n");
    commit("seed");
    const server = createServerInRepo(repoDir);

    const response = parse(await server.callTool("graft_dead_symbols", {}));
    const advertised = response["_schema"] as { id: string; version: string };

    const named = MCP_TOOL_NAMES.filter((tool) => {
      const meta = getMcpOutputSchemaMeta(tool);
      return meta.id === advertised.id && meta.version === advertised.version;
    });
    expect(named).toEqual(["graft_dead_symbols"]);
    expect(advertised.version).toBe("2.0.0");
    const validator = getMcpOutputSchema("graft_dead_symbols");
    expect(() => validator.parse(response)).not.toThrow();
    const withoutHistory = Object.fromEntries(Object.entries(response).filter(([key]) => key !== "history"));
    expect(validator.safeParse(withoutHistory).success).toBe(false);
    expect(validator.safeParse({ ...response, _schema: { ...advertised, version: "1.0.0" } }).success).toBe(false);

    expect(CLI_COMMAND_NAMES).toContain("struct_dead_symbols");
    expect(getCliOutputSchemaMeta("struct_dead_symbols").version).toBe("2.0.0");
  });
});
