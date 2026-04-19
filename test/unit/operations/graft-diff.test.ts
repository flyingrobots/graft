import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { graftDiff } from "../../../src/operations/graft-diff.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { realFs } from "../../helpers/real-fs.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";

describe("operations: graft diff", () => {
  let tmpDir: string;

  function diffOptions(overrides: Partial<Parameters<typeof graftDiff>[0]> = {}) {
    return {
      cwd: tmpDir,
      fs: realFs,
      git: nodeGit,
      resolveWorkingTreePath: (filePath: string) => path.join(tmpDir, filePath),
      ...overrides,
    };
  }

  beforeEach(() => {
    tmpDir = createTestRepo("graft-diff-op-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("diffs modified file between two refs", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): void {}\nexport function bar(): string { return ""; }\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.path).toBe("a.ts");
    expect(result.files[0]!.status).toBe("modified");
    expect(result.files[0]!.diff.added).toHaveLength(1);
    expect(result.files[0]!.diff.added[0]!.name).toBe("bar");
  });

  it("detects added files", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const x = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export function newFn(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    const bFile = result.files.find((f) => f.path === "b.ts");
    expect(bFile).toBeDefined();
    expect(bFile!.status).toBe("added");
    expect(bFile!.diff.added.length).toBeGreaterThan(0);
  });

  it("detects deleted files", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function gone(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.unlinkSync(path.join(tmpDir, "a.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.status).toBe("deleted");
    expect(result.files[0]!.diff.removed.length).toBeGreaterThan(0);
  });

  it("diffs multiple files at once", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 1;\n');
    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const b = 2;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 1;\nexport const a2 = 11;\n');
    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const b = 2;\nexport const b2 = 22;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    expect(result.files).toHaveLength(2);
  });

  it("diffs working tree vs HEAD (default)", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function original(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    // Modify without committing
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function original(): void {}\nexport function uncommitted(): void {}\n');

    const result = await graftDiff(diffOptions());
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.diff.added).toHaveLength(1);
    expect(result.files[0]!.diff.added[0]!.name).toBe("uncommitted");
  });

  it("detects changed signatures", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function greet(name: string): string { return name; }\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function greet(name: string, title: string): string { return name; }\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    expect(result.files[0]!.diff.changed).toHaveLength(1);
    expect(result.files[0]!.diff.changed[0]!.name).toBe("greet");
  });

  it("skips non-supported file extensions", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 1;\n');
    fs.writeFileSync(path.join(tmpDir, "readme.md"), '# Hello\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "readme.md"), '# Changed\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    const md = result.files.find((f) => f.path === "readme.md");
    expect(md).toBeDefined();
    expect(md!.diff.added).toHaveLength(0);
    expect(md!.diff.removed).toHaveLength(0);
    expect(md!.diff.changed).toHaveLength(0);
  });

  it("filters by path when provided", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 1;\n');
    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const b = 2;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 11;\n');
    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const b = 22;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD", path: "a.ts" }));
    expect(result.files).toHaveLength(1);
    expect(result.files[0]!.path).toBe("a.ts");
  });

  it("includes summary line per file", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): void {}\nexport function bar(): string { return ""; }\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v2");

    const result = await graftDiff(diffOptions({ base: "HEAD~1", head: "HEAD" }));
    expect(result.files[0]!.summary).toBe("a.ts | modified | +1 added, =1 unchanged");
  });

  it("includes base and head labels in result", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export const a = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m v1");

    const result = await graftDiff(diffOptions({ base: "HEAD", head: "HEAD" }));
    expect(result.base).toBe("HEAD");
    expect(result.head).toBe("HEAD");
  });
});
