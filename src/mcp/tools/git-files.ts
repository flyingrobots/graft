import { execFileSync } from "node:child_process";

type GitFileListMode = "tracked" | "project";

export class GitFileQuery {
  readonly cwd: string;
  readonly dirPath: string;
  readonly mode: GitFileListMode;

  constructor(opts: {
    cwd: string;
    dirPath: string;
    mode: GitFileListMode;
  }) {
    if (opts.cwd.trim().length === 0) {
      throw new Error("GitFileQuery: cwd must be non-empty");
    }
    this.cwd = opts.cwd;
    this.dirPath = opts.dirPath.trim();
    this.mode = opts.mode;
    Object.freeze(this);
  }

  static tracked(cwd: string, dirPath: string): GitFileQuery {
    return new GitFileQuery({ cwd, dirPath, mode: "tracked" });
  }

  static project(cwd: string, dirPath: string): GitFileQuery {
    return new GitFileQuery({ cwd, dirPath, mode: "project" });
  }

  toArgs(): string[] {
    if (this.mode === "tracked") {
      return this.dirPath.length > 0 ? ["ls-files", "--", this.dirPath] : ["ls-files"];
    }

    return this.dirPath.length > 0
      ? ["ls-files", "--cached", "--others", "--exclude-standard", "--", this.dirPath]
      : ["ls-files", "--cached", "--others", "--exclude-standard"];
  }
}

export class GitFileList {
  readonly paths: readonly string[];

  constructor(paths: readonly string[]) {
    this.paths = Object.freeze([...paths]);
    Object.freeze(this);
  }
}

export function listGitFiles(query: GitFileQuery): GitFileList {
  try {
    const output = execFileSync("git", query.toArgs(), {
      cwd: query.cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    const paths = output.length === 0 ? [] : output.split("\n");
    return new GitFileList(paths);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`git file listing failed: ${message}`, { cause: err });
  }
}

/**
 * List git-tracked files, optionally scoped to a directory.
 */
export function listTrackedFiles(dirPath: string, cwd: string): string[] {
  return [...listGitFiles(GitFileQuery.tracked(cwd, dirPath)).paths];
}

/**
 * List tracked and untracked project files, optionally scoped to a directory.
 * Untracked files are included so live queries can see draft work before it
 * is staged or committed.
 */
export function listProjectFiles(dirPath: string, cwd: string): string[] {
  return [...listGitFiles(GitFileQuery.project(cwd, dirPath)).paths];
}
