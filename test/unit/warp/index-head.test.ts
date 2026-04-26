import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";

describe("warp: index HEAD", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("warp-index-head-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("indexes a multi-file repo and resolves import references", async () => {
    // Create a small project
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src/utils.ts"),
      "export function foo(): string { return \"hello\"; }\nexport function bar(): number { return 42; }\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "src/main.ts"),
      "import { foo } from \"./utils\";\n\nexport function main(): void {\n  console.log(foo());\n}\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx: { app: warp, strandId: null } });

    expect(result.ok).toBe(true);
    expect(result.filesIndexed).toBe(2);

    await warp.core().materialize();

    // Query: find the resolves_to edge from import string to utils file
    const obs = await warp.observer({ match: ["ast:*", "file:*"] });
    const edges = await obs.getEdges();

    const resolvesTo = edges.filter((e) => e.label === "resolves_to");
    const utilsResolve = resolvesTo.find((e) => e.to === "file:src/utils.ts");
    expect(utilsResolve).toBeDefined();

    // Verify AST nodes exist for both files
    const astNodes = (await obs.getNodes()).filter((n) => n.startsWith("ast:"));
    const mainAst = astNodes.filter((n) => n.startsWith("ast:src/main.ts:"));
    const utilsAst = astNodes.filter((n) => n.startsWith("ast:src/utils.ts:"));
    expect(mainAst.length).toBeGreaterThan(0);
    expect(utilsAst.length).toBeGreaterThan(0);
  });

  it("handles aliased imports correctly", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src/lib.ts"),
      "export function create(): void {}\n",
    );
    fs.writeFileSync(
      path.join(tmpDir, "src/app.ts"),
      "import { create as makeNew } from \"./lib\";\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const warp = await openWarp({ cwd: tmpDir });
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx: { app: warp, strandId: null } });
    await warp.core().materialize();

    const obs = await warp.observer({ match: "ast:*" });
    const nodes = await obs.getNodes();

    // Find the import specifier and check its properties
    let foundSpecifier = false;
    for (const nodeId of nodes) {
      const props = await obs.getNodeProps(nodeId);
      if (props !== null && props["importedName"] === "create" && props["localName"] === "makeNew") {
        foundSpecifier = true;
        break;
      }
    }
    expect(foundSpecifier).toBe(true);
  });

  it("skips non-parseable files gracefully", async () => {
    fs.writeFileSync(path.join(tmpDir, "readme.md"), "# Hello\n");
    fs.writeFileSync(path.join(tmpDir, "data.json"), "{}");
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx: { app: warp, strandId: null } });

    // Only app.ts should be indexed
    expect(result.filesIndexed).toBe(1);
  });

  it("emits file nodes for all parsed files", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export const a = 1;\n");
    fs.writeFileSync(path.join(tmpDir, "src/b.ts"), "export const b = 2;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const warp = await openWarp({ cwd: tmpDir });
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx: { app: warp, strandId: null } });
    await warp.core().materialize();

    const obs = await warp.observer({ match: "file:*" });
    const fileNodes = await obs.getNodes();
    expect(fileNodes).toContain("file:src/a.ts");
    expect(fileNodes).toContain("file:src/b.ts");
  });

  it("refuses oversized eager index calls before writing a patch", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src/a.ts"), "export const a = 1;\n");
    fs.writeFileSync(path.join(tmpDir, "src/b.ts"), "export const b = 2;\n");
    fs.writeFileSync(path.join(tmpDir, "src/c.ts"), "export const c = 3;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const warp = await openWarp({ cwd: tmpDir });
    await expect(indexHead({
      cwd: tmpDir,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx: { app: warp, strandId: null },
      maxFilesPerCall: 2,
    })).rejects.toThrow("Lazy indexing policy");

    const ref = git(tmpDir, "show-ref --verify refs/warp/graft-ast/writers/graft || true");
    expect(ref.trim()).toBe("");
  });
});
