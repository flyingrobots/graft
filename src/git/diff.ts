import { execFileSync } from "node:child_process";

export interface ChangedFilesOptions {
  cwd: string;
  base?: string | undefined;
  head?: string | undefined;
}

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}

/**
 * List files changed between two refs, or between a ref and the working tree.
 * If head is omitted, diffs against the working tree.
 * If both base and head are omitted, diffs HEAD against the working tree.
 *
 * Throws GitError for invalid refs or non-git directories.
 * Returns empty array only when there are genuinely no changes.
 */
export function getChangedFiles(opts: ChangedFilesOptions): string[] {
  const base = opts.base ?? "HEAD";
  const args = opts.head !== undefined
    ? ["diff", "--name-only", base, opts.head]
    : ["diff", "--name-only", base];

  try {
    const output = execFileSync("git", args, {
      cwd: opts.cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    if (output === "") return [];
    return output.split("\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // git diff exits 0 for no changes; a non-zero exit means a real error
    throw new GitError(`git diff failed: ${msg}`);
  }
}

/**
 * Get the content of a file at a specific git ref.
 * Returns null if the file doesn't exist at that ref (clean absence).
 * Throws GitError for invalid refs or git failures.
 */
export function getFileAtRef(
  ref: string,
  filePath: string,
  cwd: string,
): string | null {
  try {
    return execFileSync("git", ["show", `${ref}:${filePath}`], {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // "does not exist" or "exists on disk, but not in" = clean absence
    if (msg.includes("does not exist") || msg.includes("exists on disk, but not in")) {
      return null;
    }
    // Everything else (bad ref, not a repo, etc.) is a real error
    throw new GitError(`git show ${ref}:${filePath} failed: ${msg}`);
  }
}
