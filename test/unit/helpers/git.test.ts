import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { assertIsolatedGitTestDir, cleanupTestRepo, createTestRepo, git } from "../../helpers/git.js";

describe("test helper: git isolation", () => {
  it("allows temp sandbox directories", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "graft-git-helper-"));
    try {
      expect(() => {
        assertIsolatedGitTestDir(tmpDir);
      }).not.toThrow();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("refuses the live repo root", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    expect(() => {
      assertIsolatedGitTestDir(repoRoot);
    }).toThrow(/Refusing to run git test command in live repo path/);
  });

  it("refuses live-repo git commands before they execute", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    expect(() => {
      git(repoRoot, "status --short");
    }).toThrow(/Refusing to run git test command in live repo path/);
  });

  it("creates temp repos in the temp sandbox", () => {
    const repoDir = createTestRepo("graft-git-helper-repo-");
    try {
      expect(repoDir.startsWith(os.tmpdir())).toBe(true);
      expect(git(repoDir, "rev-parse --is-inside-work-tree")).toBe("true");
      expect(git(repoDir, "symbolic-ref --short HEAD")).toBe("main");
      expect(git(repoDir, "config --get core.fsmonitor")).toBe("false");
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("scrubs inherited Git repository environment before executing commands", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    const repoDir = createTestRepo("graft-git-helper-env-");
    const previousGitDir = process.env["GIT_DIR"];
    const previousGitWorkTree = process.env["GIT_WORK_TREE"];
    try {
      process.env["GIT_DIR"] = path.join(repoRoot, ".git");
      process.env["GIT_WORK_TREE"] = repoRoot;

      const resolved = fs.realpathSync.native(repoDir);
      expect(fs.realpathSync.native(git(repoDir, "rev-parse --show-toplevel"))).toBe(resolved);
    } finally {
      if (previousGitDir === undefined) {
        delete process.env["GIT_DIR"];
      } else {
        process.env["GIT_DIR"] = previousGitDir;
      }
      if (previousGitWorkTree === undefined) {
        delete process.env["GIT_WORK_TREE"];
      } else {
        process.env["GIT_WORK_TREE"] = previousGitWorkTree;
      }
      cleanupTestRepo(repoDir);
    }
  });
});
