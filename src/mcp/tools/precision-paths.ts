import * as path from "node:path";
import { GitError } from "../../git/diff.js";
import type { GitClient } from "../../ports/git.js";

async function git(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string> {
  const result = await gitClient.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

export function normalizeRepoPath(projectRoot: string, input: string): string {
  if (!path.isAbsolute(input)) return input;
  const rel = path.relative(projectRoot, input);
  if (rel === "") return ".";
  return rel.startsWith("..") ? input : rel;
}

export function requireRepoPath(projectRoot: string, input: string): string {
  const normalized = normalizeRepoPath(projectRoot, input);
  if (path.isAbsolute(normalized)) {
    throw new Error(`Path must be inside the repository for git-ref queries: ${input}`);
  }
  return normalized;
}

export async function resolveGitRef(ref: string, gitClient: GitClient, cwd: string): Promise<string> {
  try {
    return (await git(gitClient, ["rev-parse", "--verify", ref], cwd)).trim();
  } catch {
    throw new GitError(`ref does not exist: ${ref}`);
  }
}

export async function listTrackedFilesAtRef(
  dirPath: string,
  gitClient: GitClient,
  cwd: string,
  ref: string,
): Promise<string[]> {
  try {
    const args = dirPath.length > 0
      ? ["ls-tree", "-r", "--name-only", ref, "--", dirPath]
      : ["ls-tree", "-r", "--name-only", ref];
    const output = (await git(gitClient, args, cwd)).trim();
    return output.length === 0 ? [] : output.split("\n");
  } catch {
    return [];
  }
}

export async function isWorkingTreeDirty(gitClient: GitClient, cwd: string): Promise<boolean> {
  try {
    return (await git(gitClient, ["status", "--porcelain"], cwd)).trim().length > 0;
  } catch {
    return true;
  }
}
