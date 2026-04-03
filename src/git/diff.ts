import { execSync } from "node:child_process";

export interface ChangedFilesOptions {
  cwd: string;
  base?: string | undefined;
  head?: string | undefined;
}

/**
 * List files changed between two refs, or between a ref and the working tree.
 * If head is omitted, diffs against the working tree.
 * If both base and head are omitted, diffs HEAD against the working tree.
 */
export function getChangedFiles(opts: ChangedFilesOptions): string[] {
  const base = opts.base ?? "HEAD";
  const args = opts.head !== undefined
    ? `diff --name-only ${base} ${opts.head}`
    : `diff --name-only ${base}`;

  try {
    const output = execSync(`git ${args}`, {
      cwd: opts.cwd,
      encoding: "utf-8",
    }).trim();
    if (output === "") return [];
    return output.split("\n");
  } catch {
    return [];
  }
}

/**
 * Get the content of a file at a specific git ref.
 * Returns null if the file doesn't exist at that ref.
 */
export function getFileAtRef(
  ref: string,
  filePath: string,
  cwd: string,
): string | null {
  try {
    return execSync(`git show ${ref}:${filePath}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}
