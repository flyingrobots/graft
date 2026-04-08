import type { GitClient } from "../ports/git.js";

export interface ChangedFilesOptions {
  cwd: string;
  git: GitClient;
  base?: string | undefined;
  head?: string | undefined;
}

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitError";
  }
}

function git(gitClient: GitClient, args: readonly string[], cwd: string): string {
  const result = gitClient.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

function refExists(ref: string, cwd: string, gitClient: GitClient): boolean {
  try {
    git(gitClient, ["rev-parse", "--verify", ref], cwd);
    return true;
  } catch {
    return false;
  }
}

function objectExists(ref: string, filePath: string, cwd: string, gitClient: GitClient): boolean {
  try {
    git(gitClient, ["cat-file", "-e", `${ref}:${filePath}`], cwd);
    return true;
  } catch {
    return false;
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
    const output = git(opts.git, args, opts.cwd).trim();
    if (output === "") return [];
    return output.split("\n");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GitError(`git diff failed: ${msg}`);
  }
}

/**
 * Get the content of a file at a specific git ref.
 * Returns null if the file doesn't exist at that ref (clean absence).
 * Throws GitError for invalid refs or git failures.
 *
 * Uses `git rev-parse --verify` and `git cat-file -e` for stable
 * detection — no error message parsing.
 */
export function getFileAtRef(
  ref: string,
  filePath: string,
  opts: {
    cwd: string;
    git: GitClient;
  },
): string | null {
  // Validate the ref exists (stable probe, no message parsing)
  if (!refExists(ref, opts.cwd, opts.git)) {
    throw new GitError(`ref does not exist: ${ref}`);
  }

  // Check if the object exists at this ref (stable probe)
  if (!objectExists(ref, filePath, opts.cwd, opts.git)) {
    return null; // Clean absence — file not in this ref
  }

  // Object exists — read it
  try {
    return git(opts.git, ["show", `${ref}:${filePath}`], opts.cwd);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new GitError(`git show ${ref}:${filePath} failed: ${msg}`);
  }
}
