import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { git, createTestRepo, cleanupTestRepo } from "../../helpers/git.js";
import { buildSessionResume } from "../../../src/operations/cross-session-resume.js";
import { nodeGit } from "../../../src/adapters/node-git.js";

describe("operations: cross-session-resume", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTestRepo("graft-resume-");
  });

  afterEach(() => {
    cleanupTestRepo(tmpDir);
  });

  it("reports structural diff between saved HEAD and current HEAD", async () => {
    // Commit 1: initial
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "export function greet(): string { return 'hi'; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'initial'");
    const savedHead = git(tmpDir, "rev-parse HEAD");

    // Commit 2: change signature
    fs.writeFileSync(
      path.join(tmpDir, "app.ts"),
      "export function greet(name: string): string { return name; }\n",
    );
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'change greet'");

    const resume = await buildSessionResume({
      cwd: tmpDir,
      savedHeadSha: savedHead, git: nodeGit,
    });

    expect(resume.resumable).toBe(true);
    expect(resume.changedFiles.length).toBeGreaterThan(0);
    expect(resume.changedFiles[0]!.path).toContain("app.ts");
  });

  it("reports no changes when HEAD is unchanged", async () => {
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");
    const head = git(tmpDir, "rev-parse HEAD");

    const resume = await buildSessionResume({
      cwd: tmpDir,
      savedHeadSha: head, git: nodeGit,
    });

    expect(resume.resumable).toBe(true);
    expect(resume.changedFiles).toEqual([]);
  });

  it("reports new files added since saved HEAD", async () => {
    fs.writeFileSync(path.join(tmpDir, "old.ts"), "export const old = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'old'");
    const savedHead = git(tmpDir, "rev-parse HEAD");

    fs.writeFileSync(path.join(tmpDir, "new.ts"), "export function fresh(): void {}\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add new'");

    const resume = await buildSessionResume({
      cwd: tmpDir,
      savedHeadSha: savedHead, git: nodeGit,
    });

    expect(resume.changedFiles.some((f) => f.path.includes("new.ts"))).toBe(true);
  });

  it("handles deleted files", async () => {
    fs.writeFileSync(path.join(tmpDir, "doomed.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'add doomed'");
    const savedHead = git(tmpDir, "rev-parse HEAD");

    fs.unlinkSync(path.join(tmpDir, "doomed.ts"));
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'delete doomed'");

    const resume = await buildSessionResume({
      cwd: tmpDir,
      savedHeadSha: savedHead, git: nodeGit,
    });

    expect(resume.changedFiles.some((f) => f.path.includes("doomed.ts"))).toBe(true);
  });

  it("returns not resumable when saved HEAD is unknown", async () => {
    fs.writeFileSync(path.join(tmpDir, "app.ts"), "export const x = 1;\n");
    git(tmpDir, "add -A");
    git(tmpDir, "commit -m 'init'");

    const resume = await buildSessionResume({
      cwd: tmpDir,
      savedHeadSha: "0000000000000000000000000000000000000000", git: nodeGit,
    });

    expect(resume.resumable).toBe(false);
  });
});
