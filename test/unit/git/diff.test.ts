import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { getChangedFiles, getFileAtRef, GitError } from "../../../src/git/diff.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";

describe("git: diff helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-git-");
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m initial");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("lists changed files between HEAD and working tree", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): string { return "changed"; }\n');
    const files = await getChangedFiles({ cwd: tmpDir, git: nodeGit });
    expect(files).toContain("a.ts");
  });

  it("lists changed files between two refs", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function bar(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m second");
    const files = await getChangedFiles({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toContain("a.ts");
  });

  it("lists added files", async () => {
    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const x = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m add-b");
    const files = await getChangedFiles({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toContain("b.ts");
  });

  it("lists deleted files", async () => {
    fs.unlinkSync(path.join(tmpDir, "a.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m delete-a");
    const files = await getChangedFiles({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toContain("a.ts");
  });

  it("returns empty array when no changes", async () => {
    const files = await getChangedFiles({ cwd: tmpDir, git: nodeGit, base: "HEAD", head: "HEAD" });
    expect(files).toEqual([]);
  });

  it("gets file content at a ref", async () => {
    const content = await getFileAtRef("HEAD", "a.ts", { cwd: tmpDir, git: nodeGit });
    expect(content).toContain("export function foo");
  });

  it("returns null for file that doesn't exist at ref", async () => {
    const content = await getFileAtRef("HEAD", "nonexistent.ts", { cwd: tmpDir, git: nodeGit });
    expect(content).toBeNull();
  });

  it("throws GitError for invalid ref in getChangedFiles", async () => {
    await expect(getChangedFiles({ cwd: tmpDir, git: nodeGit, base: "nonexistent-ref", head: "HEAD" }))
      .rejects
      .toThrow(GitError);
  });

  it("throws GitError for invalid ref in getFileAtRef", async () => {
    await expect(getFileAtRef("nonexistent-ref", "a.ts", { cwd: tmpDir, git: nodeGit }))
      .rejects
      .toThrow(GitError);
  });
});

// --- Tests added for review-renamed-files-false-breaking cycle ---

import { getChangedFilesWithStatus } from "../../../src/git/diff.js";

describe("git: diff helpers — rename-aware changed files", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-git-rename-");
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export function foo(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m initial");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("returns renamed status with oldPath for renamed files", async () => {
    git(tmpDir, "mv a.ts b.ts");
    git(tmpDir, "commit -m rename");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("b.ts");
    expect(files[0]!.status).toBe("renamed");
    expect(files[0]!.oldPath).toBe("a.ts");
  });

  it("returns modified status for modified files", async () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), "export function foo(): string { return \"\"; }\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m modify");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("a.ts");
    expect(files[0]!.status).toBe("modified");
    expect(files[0]!.oldPath).toBeUndefined();
  });

  it("returns added status for new files", async () => {
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m add-b");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    const b = files.find((f) => f.path === "b.ts");
    expect(b).toBeDefined();
    expect(b!.status).toBe("added");
  });

  it("returns deleted status for deleted files", async () => {
    fs.unlinkSync(path.join(tmpDir, "a.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m delete-a");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("a.ts");
    expect(files[0]!.status).toBe("deleted");
  });

  it("detects rename with content changes", async () => {
    git(tmpDir, "mv a.ts b.ts");
    fs.writeFileSync(path.join(tmpDir, "b.ts"), "export function foo(): void {}\nexport function bar(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m rename-and-edit");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("b.ts");
    expect(files[0]!.status).toBe("renamed");
    expect(files[0]!.oldPath).toBe("a.ts");
  });

  it("returns empty array for no changes", async () => {
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD", head: "HEAD" });
    expect(files).toEqual([]);
  });

  it("handles multiple renames in same commit", async () => {
    fs.writeFileSync(path.join(tmpDir, "c.ts"), "export function baz(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m add-c");
    git(tmpDir, "mv a.ts x.ts");
    git(tmpDir, "mv c.ts y.ts");
    git(tmpDir, "commit -m rename-both");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    const x = files.find((f) => f.path === "x.ts");
    const y = files.find((f) => f.path === "y.ts");
    expect(x).toBeDefined();
    expect(x!.status).toBe("renamed");
    expect(x!.oldPath).toBe("a.ts");
    expect(y).toBeDefined();
    expect(y!.status).toBe("renamed");
    expect(y!.oldPath).toBe("c.ts");
  });

  it("detects rename to different directory", async () => {
    fs.mkdirSync(path.join(tmpDir, "lib"), { recursive: true });
    git(tmpDir, "mv a.ts lib/a.ts");
    git(tmpDir, "commit -m rename-to-dir");
    const files = await getChangedFilesWithStatus({ cwd: tmpDir, git: nodeGit, base: "HEAD~1", head: "HEAD" });
    expect(files).toHaveLength(1);
    expect(files[0]!.path).toBe("lib/a.ts");
    expect(files[0]!.status).toBe("renamed");
    expect(files[0]!.oldPath).toBe("a.ts");
  });
});
