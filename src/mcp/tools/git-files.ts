import { execFileSync } from "node:child_process";

function runGitFileList(args: string[], cwd: string): string[] {
  try {
    const output = execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return output.length === 0 ? [] : output.split("\n");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`git file listing failed: ${message}`, { cause: err });
  }
}

/**
 * List git-tracked files, optionally scoped to a directory.
 */
export function listTrackedFiles(dirPath: string, cwd: string): string[] {
  const args = dirPath.length > 0 ? ["ls-files", "--", dirPath] : ["ls-files"];
  return runGitFileList(args, cwd);
}

/**
 * List tracked and untracked project files, optionally scoped to a directory.
 * Untracked files are included so live queries can see draft work before it
 * is staged or committed.
 */
export function listProjectFiles(dirPath: string, cwd: string): string[] {
  const args = dirPath.length > 0
    ? ["ls-files", "--cached", "--others", "--exclude-standard", "--", dirPath]
    : ["ls-files", "--cached", "--others", "--exclude-standard"];
  return runGitFileList(args, cwd);
}
