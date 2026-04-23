// ---------------------------------------------------------------------------
// Cross-session resume — structural diff from saved HEAD to current HEAD
// ---------------------------------------------------------------------------

import type { GitClient } from "../ports/git.js";

/** A file that changed between saved HEAD and current HEAD. */
export interface ResumeChangedFile {
  readonly path: string;
  readonly status: "added" | "modified" | "deleted" | "renamed";
}

/** Result of attempting to resume from a saved session state. */
export interface SessionResumeResult {
  readonly resumable: boolean;
  readonly currentHead: string;
  readonly savedHead: string;
  readonly changedFiles: readonly ResumeChangedFile[];
  readonly commitsBehind: number;
  readonly error?: string;
}

export interface SessionResumeOptions {
  readonly cwd: string;
  readonly savedHeadSha: string;
  readonly git: GitClient;
}

/**
 * Build a structural resume from a saved HEAD to current HEAD.
 *
 * Uses plumbing-safe git commands (diff-tree, rev-list, log) to
 * find changed files and count commits between two points.
 */
export async function buildSessionResume(
  options: SessionResumeOptions,
): Promise<SessionResumeResult> {
  const { cwd, savedHeadSha, git } = options;

  const headResult = await git.run({ cwd, args: ["rev-parse", "HEAD"] });
  const currentHead = headResult.stdout.trim();
  if (headResult.status !== 0 || currentHead.length === 0) {
    return {
      resumable: false, currentHead: "", savedHead: savedHeadSha,
      changedFiles: [], commitsBehind: 0,
      error: "Cannot resolve current HEAD",
    };
  }

  // Check if saved HEAD exists in the repo
  const verifyResult = await git.run({ cwd, args: ["cat-file", "-t", savedHeadSha] });
  if (verifyResult.stdout.trim() !== "commit") {
    return {
      resumable: false, currentHead, savedHead: savedHeadSha,
      changedFiles: [], commitsBehind: 0,
      error: "Saved HEAD SHA not found in repository",
    };
  }

  if (currentHead === savedHeadSha) {
    return {
      resumable: true, currentHead, savedHead: savedHeadSha,
      changedFiles: [], commitsBehind: 0,
    };
  }

  // Use diff-tree (plumbing-safe) with -r for recursive
  const diffResult = await git.run({
    cwd,
    args: ["diff-tree", "-r", "--name-status", "--no-commit-id", savedHeadSha, currentHead],
  });
  const changedFiles: ResumeChangedFile[] = [];
  const diffOutput = diffResult.stdout.trim();

  if (diffOutput.length > 0) {
    for (const line of diffOutput.split("\n")) {
      const parts = line.split("\t");
      if (parts.length < 2) continue;
      const statusChar = (parts[0] ?? "").charAt(0);
      const filePath = parts[parts.length - 1] ?? "";

      let status: ResumeChangedFile["status"];
      switch (statusChar) {
        case "A": status = "added"; break;
        case "D": status = "deleted"; break;
        case "R": status = "renamed"; break;
        default: status = "modified"; break;
      }
      changedFiles.push({ path: filePath, status });
    }
  }

  // Count commits
  const countResult = await git.run({
    cwd,
    args: ["rev-list", "--count", `${savedHeadSha}..${currentHead}`],
  });
  const commitsBehind = parseInt(countResult.stdout.trim(), 10) || 0;

  return {
    resumable: true, currentHead, savedHead: savedHeadSha,
    changedFiles, commitsBehind,
  };
}
