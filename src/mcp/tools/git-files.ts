import type { GitClient } from "../../ports/git.js";

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

export async function listGitFiles(query: GitFileQuery, git: GitClient): Promise<GitFileList> {
  try {
    const result = await git.run({ args: query.toArgs(), cwd: query.cwd });
    if (result.error !== undefined || result.status !== 0) {
      throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
    }
    const output = result.stdout.trim();
    const paths = output.length === 0 ? [] : output.split("\n");
    return new GitFileList(paths);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`git file listing failed: ${message}`, { cause: err });
  }
}

export async function listTrackedFiles(dirPath: string, cwd: string, git: GitClient): Promise<string[]> {
  return [...(await listGitFiles(GitFileQuery.tracked(cwd, dirPath), git)).paths];
}

export async function listProjectFiles(dirPath: string, cwd: string, git: GitClient): Promise<string[]> {
  return [...(await listGitFiles(GitFileQuery.project(cwd, dirPath), git)).paths];
}
