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
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
