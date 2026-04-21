import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { openWarp } from "../../../src/warp/open.js";
import { indexCommits, type IndexResult } from "../../../src/warp/indexer.js";
import { fileSymbolsLens, allSymbolsLens, allFilesLens } from "../../../src/warp/observers.js";
import type { WarpContext } from "../../../src/warp/context.js";
import type { GitClient } from "../../../src/ports/git.js";

function assertOk(result: IndexResult): asserts result is IndexResult & { ok: true } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
}

describe("warp: indexer", { timeout: 15000 }, () => {
  let tmpDir: string;
  const worktreeDirs: string[] = [];

  beforeEach(() => {
    tmpDir = createTestRepo("graft-warp-");
  });

  afterEach(() => {
    while (worktreeDirs.length > 0) {
      const worktreeDir = worktreeDirs.pop()!;
      git(tmpDir, `worktree remove --force ${worktreeDir}`);
    }
    cleanupTestRepo(tmpDir);
  });

  it("indexes a single commit with one file", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "foo.ts"),
      'export function greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add greet'");

    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });
    assertOk(result);

    expect(result.commitsIndexed).toBe(1);
    expect(result.patchesWritten).toBe(1);

    // Read back through observer — file should exist
    
    const fileObs = await warp.observer(allFilesLens());
    const fileNodes = await fileObs.getNodes();
    expect(fileNodes.length).toBeGreaterThanOrEqual(1);
  });

  it("indexes added symbols correctly", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "math.ts"),
      'export function add(a: number, b: number): number { return a + b; }\nexport function sub(a: number, b: number): number { return a - b; }\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add math functions'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    
    const symObs = await warp.observer(fileSymbolsLens("math.ts"));
    const symNodes = await symObs.getNodes();

    // Should have both add and sub symbols
    expect(symNodes.length).toBe(2);
  });

  it("indexes symbol additions across commits", async () => {
    // Commit 1: one function
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      'export function start(): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v1'");

    // Commit 2: add a second function
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      'export function start(): void {}\nexport function stop(): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v2'");

    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });
    assertOk(result);

    expect(result.commitsIndexed).toBe(2);
    expect(result.patchesWritten).toBe(2);

    // After both commits, should see both symbols
    
    const symObs = await warp.observer(fileSymbolsLens("app.ts"));
    const symNodes = await symObs.getNodes();
    expect(symNodes.length).toBe(2);
  });

  it("preserves canonical identity across a same-file rename when indexing incrementally", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      'export function greet(): string { return "v1"; }\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v1'");
    const c1 = git(tmpDir, "rev-parse HEAD");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    let symObs = await warp.observer(fileSymbolsLens("app.ts"));
    let symNodes = await symObs.getNodes();
    expect(symNodes).toHaveLength(1);
    const beforeProps = await symObs.getNodeProps(symNodes[0]!);
    const beforeIdentityId = beforeProps?.["identityId"];
    expect(typeof beforeIdentityId).toBe("string");

    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      'export function welcome(): string { return "v1"; }\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v2'");

    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit, from: c1 });

    symObs = await warp.observer(fileSymbolsLens("app.ts"));
    symNodes = await symObs.getNodes();
    expect(symNodes).toHaveLength(1);
    const afterProps = await symObs.getNodeProps(symNodes[0]!);
    expect(afterProps?.["name"]).toBe("welcome");
    expect(afterProps?.["identityId"]).toBe(beforeIdentityId);
  });

  it("indexes symbol removals via tombstone", async () => {
    // Commit 1: two functions
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      'export function foo(): void {}\nexport function bar(): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v1'");

    // Commit 2: remove bar
    fs.writeFileSync(
      path.join(tmpDir, "utils.ts"),
      'export function foo(): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v2'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    
    
    const symObs = await warp.observer(fileSymbolsLens("utils.ts"));
    const symNodes = await symObs.getNodes();

    // bar should be tombstoned — only foo remains
    expect(symNodes.length).toBe(1);
  });

  it("indexes signature changes", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      'export function handle(req: Request): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v1'");

    fs.writeFileSync(
      path.join(tmpDir, "api.ts"),
      'export function handle(req: Request, res: Response): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v2'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    
    const symObs = await warp.observer(fileSymbolsLens("api.ts"));
    const symNodes = await symObs.getNodes();
    expect(symNodes.length).toBe(1);

    // Check the signature was updated
    const props = await symObs.getNodeProps(symNodes[0]!);
    expect(props?.["signature"]).toContain("res: Response");
  });

  it("preserves canonical identity across a git-reported file rename", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, "src", "greet.ts"),
      'export function greet(): string { return "v1"; }\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'v1'");
    const c1 = git(tmpDir, "rev-parse HEAD");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    const beforeObs = await warp.observer(fileSymbolsLens("src/greet.ts"));
    const beforeNodes = await beforeObs.getNodes();
    expect(beforeNodes).toHaveLength(1);
    const beforeProps = await beforeObs.getNodeProps(beforeNodes[0]!);
    const beforeIdentityId = beforeProps?.["identityId"];
    expect(typeof beforeIdentityId).toBe("string");

    git(tmpDir, "mv src/greet.ts src/welcome.ts");
    git(tmpDir, "commit -m 'rename file'");

    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit, from: c1 });

    const oldObs = await warp.observer(fileSymbolsLens("src/greet.ts"));
    expect(await oldObs.getNodes()).toHaveLength(0);

    const newObs = await warp.observer(fileSymbolsLens("src/welcome.ts"));
    const newNodes = await newObs.getNodes();
    expect(newNodes).toHaveLength(1);
    const afterProps = await newObs.getNodeProps(newNodes[0]!);
    expect(afterProps?.["identityId"]).toBe(beforeIdentityId);
    expect(afterProps?.["path"]).toBeUndefined();
  });

  it("records commit metadata", async () => {
    fs.writeFileSync(path.join(tmpDir, "x.ts"), 'export const x = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'initial commit'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    
    const commitObs = await warp.observer({
      match: "commit:*",
      expose: ["sha", "message", "timestamp"],
    });
    const commitNodes = await commitObs.getNodes();
    expect(commitNodes.length).toBe(1);

    const props = await commitObs.getNodeProps(commitNodes[0]!);
    expect(props?.["message"]).toBe("initial commit");
  });

  it("handles unsupported file types gracefully", async () => {
    // Markdown — no tree-sitter parser
    fs.writeFileSync(path.join(tmpDir, "README.md"), '# Hello\n');
    // TypeScript — has parser
    fs.writeFileSync(path.join(tmpDir, "app.ts"), 'export const x = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'mixed files'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    

    // Both files should have file nodes
    const fileObs = await warp.observer(allFilesLens());
    const fileNodes = await fileObs.getNodes();
    expect(fileNodes.length).toBe(2);

    // Only app.ts should have symbol nodes
    const allSymObs = await warp.observer(allSymbolsLens());
    const allSymNodes = await allSymObs.getNodes();
    expect(allSymNodes.length).toBe(1); // just 'x' from app.ts
  });

  it("handles file deletion", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "gone.ts"),
      'export function doomed(): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add doomed'");

    fs.unlinkSync(path.join(tmpDir, "gone.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'delete doomed'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    

    // File node should be tombstoned
    const fileObs = await warp.observer(allFilesLens());
    const fileNodes = await fileObs.getNodes();
    expect(fileNodes.length).toBe(0);

    // Symbol should be tombstoned
    const symObs = await warp.observer(allSymbolsLens());
    const symNodes = await symObs.getNodes();
    expect(symNodes.length).toBe(0);
  });

  it("indexes class with methods (nested symbols)", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "service.ts"),
      `export class UserService {
  constructor() {}
  getUser(id: string): void {}
  deleteUser(id: string): void {}
}
`,
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add UserService'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    
    const symObs = await warp.observer(fileSymbolsLens("service.ts"));
    const symNodes = await symObs.getNodes();

    // UserService + constructor + getUser + deleteUser = 4
    expect(symNodes.length).toBeGreaterThanOrEqual(3);
  });

  it("returns zero for empty commit range", async () => {
    // Create at least one commit so HEAD resolves, then query a range with no new commits
    fs.writeFileSync(path.join(tmpDir, "init.ts"), 'export const init = true;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const head = git(tmpDir, "rev-parse HEAD");

    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit, from: head });
    assertOk(result);
    expect(result.commitsIndexed).toBe(0);
    expect(result.patchesWritten).toBe(0);
  });

  it("indexes only the specified range", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'c1'");
    const c1 = git(tmpDir, "rev-parse HEAD");

    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const b = 2;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'c2'");

    fs.writeFileSync(path.join(tmpDir, "c.ts"), 'export const c = 3;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'c3'");

    const warp = await openWarp({ cwd: tmpDir });
    // Only index c2 and c3 (from c1 to HEAD)
    const result = await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit, from: c1 });
    assertOk(result);

    expect(result.commitsIndexed).toBe(2);
    expect(result.patchesWritten).toBe(2);
  });

  it("shares the same warp graph across worktrees of the same repo", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "shared.ts"),
      "export function fromPrimary(): string { return \"primary\"; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'primary commit'");
    const primaryHead = git(tmpDir, "rev-parse HEAD");

    const primaryWarp = await openWarp({ cwd: tmpDir });
    const primaryResult = await indexCommits({ app: primaryWarp, strandId: null }, { cwd: tmpDir, git: nodeGit });
    assertOk(primaryResult);
    expect(primaryResult.commitsIndexed).toBe(1);

    git(tmpDir, "branch secondary");
    const worktreeDir = path.join(os.tmpdir(), `graft-warp-worktree-${String(Date.now())}`);
    git(tmpDir, `worktree add ${worktreeDir} secondary`);
    worktreeDirs.push(worktreeDir);

    const worktreeWarp = await openWarp({ cwd: worktreeDir });
    const inheritedObs = await worktreeWarp.observer(fileSymbolsLens("shared.ts"));
    const inheritedNodes = await inheritedObs.getNodes();
    expect(inheritedNodes.length).toBe(1);

    fs.writeFileSync(
      path.join(worktreeDir, "worktree.ts"),
      "export function fromWorktree(): string { return \"worktree\"; }\n",
    );
    git(worktreeDir, "add -A");
    git(worktreeDir, "commit -m 'worktree commit'");

    const worktreeResult = await indexCommits({ app: worktreeWarp, strandId: null }, {
      cwd: worktreeDir,
      git: nodeGit,
      from: primaryHead,
    });
    assertOk(worktreeResult);
    expect(worktreeResult.commitsIndexed).toBe(1);

    const reopenedPrimaryWarp = await openWarp({ cwd: tmpDir });
    const mirroredObs = await reopenedPrimaryWarp.observer(fileSymbolsLens("worktree.ts"));
    const mirroredNodes = await mirroredObs.getNodes();
    expect(mirroredNodes.length).toBe(1);
  });

  it("disambiguates same-named methods across different classes", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "components.ts"),
      `export class Header {
  render(): string { return "<header/>"; }
}

export class Footer {
  render(): string { return "<footer/>"; }
}
`,
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add Header and Footer with render methods'");

    const warp = await openWarp({ cwd: tmpDir });
    await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: nodeGit });

    const symObs = await warp.observer(fileSymbolsLens("components.ts"));
    const symNodes = await symObs.getNodes();

    // Should have 4 distinct symbols: Header, Footer, Header.render, Footer.render
    expect(symNodes.length).toBe(4);

    // Verify node IDs are distinct — both render methods must survive
    const nodeIds = new Set(symNodes);
    expect(nodeIds.size).toBe(4);

    // Verify the qualified names appear in the node IDs
    const renderNodes = symNodes.filter((id) => id.includes("render"));
    expect(renderNodes.length).toBe(2);
    expect(renderNodes.some((id) => id.includes("Header.render"))).toBe(true);
    expect(renderNodes.some((id) => id.includes("Footer.render"))).toBe(true);
  });

  it("returns an explicit error result when git fails during indexing", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "foo.ts"),
      'export function greet(): void {}\n',
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'setup'");

    const failingGit: GitClient = {
      run: () => Promise.resolve({
        status: 128,
        stdout: "",
        stderr: "fatal: not a git repository",
      }),
    };

    const warp = await openWarp({ cwd: tmpDir });
    const result = await indexCommits({ app: warp, strandId: null }, { cwd: tmpDir, git: failingGit });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not a git repository");
    }
  });
});
