import type { GitClient } from "../ports/git.js";

async function git(gitClient: GitClient, cwd: string, args: readonly string[]): Promise<string> {
  const result = await gitClient.run({ cwd, args });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

export async function getCommitMeta(
  gitClient: GitClient,
  sha: string,
  cwd: string,
): Promise<{ message: string; author: string; email: string; timestamp: string }> {
  const output = await git(gitClient, cwd, ["log", "-1", "--format=%s%n%aN%n%aE%n%aI", sha]);
  const lines = output.trim().split("\n");
  return { message: lines[0] ?? "", author: lines[1] ?? "", email: lines[2] ?? "", timestamp: lines[3] ?? "" };
}
