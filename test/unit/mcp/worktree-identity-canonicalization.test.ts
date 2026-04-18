import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  stableWorkspaceId,
  resolveWorkspaceRequest,
} from "../../../src/mcp/workspace-router-resolution.js";
import { nodeGit } from "../../../src/adapters/node-git.js";
import { createTestRepo, cleanupTestRepo, git } from "../../helpers/git.js";

describe("stableWorkspaceId", () => {
  it("produces deterministic IDs for the same input", () => {
    const a = stableWorkspaceId("worktree", "/home/user/project");
    const b = stableWorkspaceId("worktree", "/home/user/project");
    expect(a).toBe(b);
  });

  it("produces different IDs for different inputs", () => {
    const a = stableWorkspaceId("worktree", "/home/user/project-a");
    const b = stableWorkspaceId("worktree", "/home/user/project-b");
    expect(a).not.toBe(b);
  });

  it("produces different IDs for different prefixes", () => {
    const a = stableWorkspaceId("repo", "/home/user/project");
    const b = stableWorkspaceId("worktree", "/home/user/project");
    expect(a).not.toBe(b);
  });
});

describe("worktree identity: path canonicalization", () => {
  let repoDir: string | null = null;

  afterEach(() => {
    if (repoDir !== null) {
      cleanupTestRepo(repoDir);
      repoDir = null;
    }
  });

  it("produces the same worktreeId regardless of /tmp vs /private/tmp aliasing", async () => {
    repoDir = createTestRepo("graft-worktree-canon-");
    fs.writeFileSync(path.join(repoDir, "app.ts"), "export const x = 1;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    // Get the canonical path (macOS: /private/tmp/... → /private/tmp/...)
    const canonical = fs.realpathSync(repoDir);
    // If we're on macOS and the temp dir uses /tmp (symlink to /private/tmp),
    // test with both forms
    const tmpPrefix = os.tmpdir();
    const realTmpPrefix = fs.realpathSync(tmpPrefix);

    const result1 = await resolveWorkspaceRequest(nodeGit, { cwd: canonical });
    if ("code" in result1) throw new Error(`Unexpected error: ${result1.message}`);

    if (tmpPrefix !== realTmpPrefix) {
      // macOS: /tmp is a symlink to /private/tmp
      // Build an alias path using the symlink form
      const aliasPath = canonical.replace(realTmpPrefix, tmpPrefix);
      const result2 = await resolveWorkspaceRequest(nodeGit, { cwd: aliasPath });
      if ("code" in result2) throw new Error(`Unexpected error: ${result2.message}`);

      expect(result1.worktreeId).toBe(result2.worktreeId);
      expect(result1.repoId).toBe(result2.repoId);
      expect(result1.worktreeRoot).toBe(result2.worktreeRoot);
    }
    // On Linux: /tmp is real, so both paths are the same — test still passes
    expect(result1.worktreeId).toMatch(/^worktree:/);
    expect(result1.repoId).toMatch(/^repo:/);
  });

  it("worktreeRoot is always the canonical path", async () => {
    repoDir = createTestRepo("graft-worktree-root-");
    fs.writeFileSync(path.join(repoDir, "main.ts"), "export const y = 2;\n");
    git(repoDir, "add -A");
    git(repoDir, "commit -m init");

    const canonical = fs.realpathSync(repoDir);
    const result = await resolveWorkspaceRequest(nodeGit, { cwd: repoDir });
    if ("code" in result) throw new Error(`Unexpected error: ${result.message}`);

    expect(result.worktreeRoot).toBe(canonical);
  });
});
