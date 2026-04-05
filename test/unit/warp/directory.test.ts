import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits } from "../../../src/warp/indexer.js";
import { directoryFilesLens, fileSymbolsLens } from "../../../src/warp/observers.js";

describe("warp: directory tree modeling", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-dir-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("creates directory nodes from file paths", async () => {
    fs.mkdirSync(path.join(tmpDir, "src", "mcp"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "mcp", "server.ts"),
      'export function createServer(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'nested file'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits(warp, { cwd: tmpDir });
    await warp.core().materialize();

    // Should have dir:src and dir:src/mcp
    const dirObs = await warp.observer({ match: "dir:*" });
    const dirNodes = await dirObs.getNodes();
    expect(dirNodes.length).toBe(2);
  });

  it("directory files lens scopes to a subtree", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "test"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "app.ts"),
      'export function main(): void {}\n');
    fs.writeFileSync(path.join(tmpDir, "test", "app.test.ts"),
      'export function testMain(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'src and test'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits(warp, { cwd: tmpDir });
    await warp.core().materialize();

    // Scoped to src/ — should only see src/app.ts
    const srcFiles = await warp.observer(directoryFilesLens("src"));
    const srcNodes = await srcFiles.getNodes();
    expect(srcNodes.length).toBe(1);

    // Scoped to test/ — should only see test/app.test.ts
    const testFiles = await warp.observer(directoryFilesLens("test"));
    const testNodes = await testFiles.getNodes();
    expect(testNodes.length).toBe(1);
  });

  it("supports structural map query (files + symbols)", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "math.ts"),
      'export function add(a: number, b: number): number { return a + b; }\nexport function sub(a: number, b: number): number { return a - b; }\n');
    fs.writeFileSync(path.join(tmpDir, "src", "greet.ts"),
      'export function hello(name: string): string { return name; }\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'src files'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits(warp, { cwd: tmpDir });
    await warp.core().materialize();

    // Get all files in src/
    const fileObs = await warp.observer(directoryFilesLens("src"));
    const fileNodes = await fileObs.getNodes();
    expect(fileNodes.length).toBe(2);

    // For each file, get symbols
    let totalSymbols = 0;
    for (const fileNodeId of fileNodes) {
      const fileProps = await fileObs.getNodeProps(fileNodeId);
      const filePath = fileProps?.["path"] as string;
      const symObs = await warp.observer(fileSymbolsLens(filePath));
      const symNodes = await symObs.getNodes();
      totalSymbols += symNodes.length;
    }

    // math.ts: add + sub = 2, greet.ts: hello = 1
    expect(totalSymbols).toBe(3);
  });
});
