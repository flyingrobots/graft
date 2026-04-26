import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateAgentWorktreeHygiene,
  findBlockedAgentWorktreePaths,
  parseLsFilesStagePaths,
} from "../../../scripts/check-agent-worktree-hygiene.js";
import { cleanupTestRepo, createTestRepo, ensureGitRepo, git } from "../../helpers/git.js";

describe("agent worktree hygiene", () => {
  it("parses staged git paths from ls-files --stage output", () => {
    const output = [
      "160000 0123456789012345678901234567890123456789 0\t.claude/worktrees/agent-1",
      "100644 abcdefabcdefabcdefabcdefabcdefabcdefabcd 0\tsrc/index.ts",
      "",
    ].join("\0");

    expect(parseLsFilesStagePaths(output)).toEqual([
      ".claude/worktrees/agent-1",
      "src/index.ts",
    ]);
  });

  it("detects tracked paths under .claude/worktrees", () => {
    expect(findBlockedAgentWorktreePaths([
      "./.claude/worktrees/agent-1",
      ".claude/worktrees/agent-2/file.txt",
      "src/index.ts",
    ])).toEqual([
      ".claude/worktrees/agent-1",
      ".claude/worktrees/agent-2/file.txt",
    ]);
  });

  it("passes when the git index does not contain agent worktree paths", () => {
    const repoDir = createTestRepo("graft-agent-worktree-clean-");
    try {
      fs.writeFileSync(path.join(repoDir, "README.md"), "# clean\n");
      git(repoDir, "add -A");

      expect(evaluateAgentWorktreeHygiene(repoDir).blockedPaths).toEqual([]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });

  it("blocks ignored embedded agent worktree gitlinks that are forced into the index", () => {
    const repoDir = createTestRepo("graft-agent-worktree-blocked-");
    try {
      fs.writeFileSync(path.join(repoDir, ".gitignore"), ".claude/worktrees/\n");
      git(repoDir, "add .gitignore");

      const nestedRepo = path.join(repoDir, ".claude", "worktrees", "agent-1");
      fs.mkdirSync(nestedRepo, { recursive: true });
      ensureGitRepo(nestedRepo);
      fs.writeFileSync(path.join(nestedRepo, "note.txt"), "nested\n");
      git(nestedRepo, "add -A");
      git(nestedRepo, "commit -m nested");

      git(repoDir, "add -f .claude/worktrees/agent-1");

      expect(evaluateAgentWorktreeHygiene(repoDir).blockedPaths).toEqual([
        ".claude/worktrees/agent-1",
      ]);
    } finally {
      cleanupTestRepo(repoDir);
    }
  });
});
