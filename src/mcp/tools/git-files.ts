import { execFileSync } from "node:child_process";

/**
 * List git-tracked files, optionally scoped to a directory.
 */
export function listTrackedFiles(dirPath: string, cwd: string): string[] {
  try {
    const args = dirPath.length > 0 ? ["ls-files", "--", dirPath] : ["ls-files"];
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
      .trim().split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}

/**
 * List tracked and untracked project files, optionally scoped to a directory.
 * Untracked files are included so live queries can see draft work before it
 * is staged or committed.
 */
export function listProjectFiles(dirPath: string, cwd: string): string[] {
  try {
    const args = dirPath.length > 0
      ? ["ls-files", "--cached", "--others", "--exclude-standard", "--", dirPath]
      : ["ls-files", "--cached", "--others", "--exclude-standard"];
    return execFileSync("git", args, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
      .trim().split("\n").filter((l) => l.length > 0);
  } catch {
    return [];
  }
}
