import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

  it("lists changed files between HEAD and working tree", () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function foo(): string { return "changed"; }\n');
    const files = getChangedFiles({ cwd: tmpDir });
    expect(files).toContain("a.ts");
  });

  it("lists changed files between two refs", () => {
    fs.writeFileSync(path.join(tmpDir, "a.ts"), 'export function bar(): void {}\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m second");
    const files = getChangedFiles({ cwd: tmpDir, base: "HEAD~1", head: "HEAD" });
    expect(files).toContain("a.ts");
  });

  it("lists added files", () => {
    fs.writeFileSync(path.join(tmpDir, "b.ts"), 'export const x = 1;\n');
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m add-b");
    const files = getChangedFiles({ cwd: tmpDir, base: "HEAD~1", head: "HEAD" });
    expect(files).toContain("b.ts");
  });

  it("lists deleted files", () => {
    fs.unlinkSync(path.join(tmpDir, "a.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m delete-a");
    const files = getChangedFiles({ cwd: tmpDir, base: "HEAD~1", head: "HEAD" });
    expect(files).toContain("a.ts");
  });

  it("returns empty array when no changes", () => {
    const files = getChangedFiles({ cwd: tmpDir, base: "HEAD", head: "HEAD" });
    expect(files).toEqual([]);
  });

  it("gets file content at a ref", () => {
    const content = getFileAtRef("HEAD", "a.ts", tmpDir);
    expect(content).toContain("export function foo");
  });

  it("returns null for file that doesn't exist at ref", () => {
    const content = getFileAtRef("HEAD", "nonexistent.ts", tmpDir);
    expect(content).toBeNull();
  });

  it("throws GitError for invalid ref in getChangedFiles", () => {
    expect(() => getChangedFiles({ cwd: tmpDir, base: "nonexistent-ref", head: "HEAD" }))
      .toThrow(GitError);
  });

  it("throws GitError for invalid ref in getFileAtRef", () => {
    expect(() => getFileAtRef("nonexistent-ref", "a.ts", tmpDir))
      .toThrow(GitError);
  });
});
