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
