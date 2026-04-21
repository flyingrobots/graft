import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { openWarp } from "../../../src/warp/open.js";
import { indexHead } from "../../../src/warp/index-head.js";
import { referencesForSymbol } from "../../../src/warp/references.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { nodePathOps } from "../../../src/adapters/node-paths.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import type { WarpContext } from "../../../src/warp/context.js";

describe("warp: referencesForSymbol", { timeout: 15000 }, () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("warp-refs-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  async function setupAndIndex(files: Record<string, string>) {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m init");

    const warp = await openWarp({ cwd: tmpDir });
    const ctx: WarpContext = { app: warp, strandId: null };
    await indexHead({ cwd: tmpDir, git: nodeGit, pathOps: nodePathOps, ctx });
    await warp.core().materialize();
    return ctx;
  }

  it("finds files that import a named symbol", async () => {
    const warp = await setupAndIndex({
      "src/utils.ts": "export function foo(): string { return \"hi\"; }\n",
      "src/main.ts": "import { foo } from \"./utils\";\nfoo();\n",
    });

    const refs = await referencesForSymbol(warp, "foo", "src/utils.ts");

    expect(refs).toHaveLength(1);
    expect(refs[0]!.filePath).toBe("src/main.ts");
    expect(refs[0]!.localName).toBe("foo");
    expect(refs[0]!.importedName).toBe("foo");
  });

  it("finds aliased imports", async () => {
    const warp = await setupAndIndex({
      "src/lib.ts": "export function create(): void {}\n",
      "src/app.ts": "import { create as makeNew } from \"./lib\";\nmakeNew();\n",
    });

    const refs = await referencesForSymbol(warp, "create", "src/lib.ts");

    expect(refs).toHaveLength(1);
    expect(refs[0]!.filePath).toBe("src/app.ts");
    expect(refs[0]!.importedName).toBe("create");
    expect(refs[0]!.localName).toBe("makeNew");
  });

  it("finds multiple referencing files", async () => {
    const warp = await setupAndIndex({
      "src/utils.ts": "export function foo(): void {}\n",
      "src/a.ts": "import { foo } from \"./utils\";\nfoo();\n",
      "src/b.ts": "import { foo } from \"./utils\";\nfoo();\n",
      "src/c.ts": "export const unrelated = 1;\n",
    });

    const refs = await referencesForSymbol(warp, "foo", "src/utils.ts");

    expect(refs).toHaveLength(2);
    const filePaths = refs.map((r) => r.filePath).sort();
    expect(filePaths).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("returns empty for unreferenced symbol", async () => {
    const warp = await setupAndIndex({
      "src/utils.ts": "export function foo(): void {}\nexport function bar(): void {}\n",
      "src/main.ts": "import { foo } from \"./utils\";\nfoo();\n",
    });

    const refs = await referencesForSymbol(warp, "bar", "src/utils.ts");

    expect(refs).toHaveLength(0);
  });

  it("finds namespace imports that reference the file", async () => {
    const warp = await setupAndIndex({
      "src/utils.ts": "export function foo(): void {}\n",
      "src/main.ts": "import * as utils from \"./utils\";\nutils.foo();\n",
    });

    const refs = await referencesForSymbol(warp, "*", "src/utils.ts");

    expect(refs).toHaveLength(1);
    expect(refs[0]!.filePath).toBe("src/main.ts");
    expect(refs[0]!.localName).toBe("utils");
    expect(refs[0]!.importedName).toBe("*");
  });

  it("finds re-exports", async () => {
    const warp = await setupAndIndex({
      "src/core.ts": "export function engine(): void {}\n",
      "src/index.ts": "export { engine } from \"./core\";\n",
    });

    const refs = await referencesForSymbol(warp, "engine", "src/core.ts");

    expect(refs).toHaveLength(1);
    expect(refs[0]!.filePath).toBe("src/index.ts");
    expect(refs[0]!.importedName).toBe("engine");
  });
});
