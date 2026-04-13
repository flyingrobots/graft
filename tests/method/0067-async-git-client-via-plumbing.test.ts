import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { nodeGit } from "../../src/adapters/node-git.js";
import { getChangedFiles, getFileAtRef } from "../../src/git/diff.js";
import { resolveWorkspaceRequest } from "../../src/mcp/workspace-router.js";
import { cleanupTestRepo, createTestRepo, git } from "../../test/helpers/git.js";

describe("0067 async git client via plumbing playback", () => {
  it("workspace resolution resolves repo and worktree identity through the async GitClient seam", async () => {
    const repoDir = createTestRepo("graft-method-0067-workspace-");
    try {
      const nestedDir = path.join(repoDir, "src", "nested");
      fs.mkdirSync(nestedDir, { recursive: true });

      const result = await resolveWorkspaceRequest(nodeGit, { cwd: nestedDir });

      expect("repoId" in result).toBe(true);
      if (!("repoId" in result)) {
        throw new Error(`expected resolved workspace, got ${JSON.stringify(result)}`);
      }
      const canonicalRepoDir = fs.realpathSync.native(repoDir);
      expect(result.worktreeRoot).toBe(canonicalRepoDir);
      expect(result.gitCommonDir).toBe(path.join(canonicalRepoDir, ".git"));
      expect(result.repoId.startsWith("repo:")).toBe(true);
      expect(result.worktreeId.startsWith("worktree:")).toBe(true);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("git diff helpers use the async GitClient seam for changed files and file-at-ref lookup", async () => {
    const repoDir = createTestRepo("graft-method-0067-diff-");
    try {
      const filePath = path.join(repoDir, "app.ts");
      fs.writeFileSync(filePath, "export const version = 1;\n");
      git(repoDir, "add -A");
      git(repoDir, "commit -m init");

      fs.writeFileSync(filePath, "export const version = 2;\n");

      const changedFiles = await getChangedFiles({ cwd: repoDir, git: nodeGit });
      const headContent = await getFileAtRef("HEAD", "app.ts", { cwd: repoDir, git: nodeGit });

      expect(changedFiles).toContain("app.ts");
      expect(headContent).toContain("version = 1");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
