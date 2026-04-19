import type { GitClient } from "../ports/git.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { HeadReflogEntry, RebaseProgressState, RepoSnapshot } from "./repo-state-types.js";

export async function git(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string> {
  const result = await gitClient.run({ args, cwd });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git exited with status ${String(result.status)}`);
  }
  return result.stdout;
}

export async function readGit(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string | null> {
  try {
    const value = (await git(gitClient, args, cwd)).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function readGitPorcelain(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string | null> {
  try {
    const value = (await git(gitClient, args, cwd)).replace(/\r?\n$/, "");
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function readGitLines(gitClient: GitClient, args: readonly string[], cwd: string): Promise<string[]> {
  const value = await readGitPorcelain(gitClient, args, cwd);
  return value === null ? [] : value.split("\n");
}

async function readGitPathText(
  fs: FileSystem,
  gitClient: GitClient,
  cwd: string,
  gitPath: string,
): Promise<string | null> {
  const resolvedPath = await readGit(gitClient, ["rev-parse", "--path-format=absolute", "--git-path", gitPath], cwd);
  if (resolvedPath === null) return null;

  try {
    const content = await fs.readFile(resolvedPath, "utf-8");
    const value = content.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function parseOptionalInt(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function countStatusLines(statusLines: readonly string[]): {
  stagedPaths: number;
  changedPaths: number;
  untrackedPaths: number;
} {
  let stagedPaths = 0;
  let changedPaths = 0;
  let untrackedPaths = 0;

  for (const statusLine of statusLines) {
    const x = statusLine[0] ?? " ";
    const y = statusLine[1] ?? " ";
    if (x === "?" && y === "?") {
      untrackedPaths++;
      continue;
    }
    if (x !== " ") stagedPaths++;
    if (y !== " ") changedPaths++;
  }

  return { stagedPaths, changedPaths, untrackedPaths };
}

async function countUnmergedPaths(gitClient: GitClient, cwd: string): Promise<number> {
  const paths = await readGitLines(gitClient, ["diff", "--name-only", "--diff-filter=U", "--"], cwd);
  return new Set(paths.filter((value) => value.length > 0)).size;
}

function mergeStatusLines(
  stagedLines: readonly string[],
  changedLines: readonly string[],
  untrackedLines: readonly string[],
): readonly string[] {
  const merged = new Map<string, { x: string; y: string }>();

  for (const line of stagedLines) {
    const parts = line.split("\t");
    const rawStatus = parts[0] ?? "";
    const filePath = parts.at(-1) ?? "";
    if (filePath.length === 0) continue;
    const existing = merged.get(filePath) ?? { x: " ", y: " " };
    existing.x = rawStatus[0] ?? "M";
    merged.set(filePath, existing);
  }

  for (const line of changedLines) {
    const parts = line.split("\t");
    const rawStatus = parts[0] ?? "";
    const filePath = parts.at(-1) ?? "";
    if (filePath.length === 0) continue;
    const existing = merged.get(filePath) ?? { x: " ", y: " " };
    existing.y = rawStatus[0] ?? "M";
    merged.set(filePath, existing);
  }

  for (const filePath of untrackedLines) {
    if (filePath.length === 0) continue;
    merged.set(filePath, { x: "?", y: "?" });
  }

  return [...merged.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([filePath, status]) => `${status.x}${status.y} ${filePath}`);
}

async function readParentShas(gitClient: GitClient, cwd: string, headSha: string | null): Promise<readonly string[]> {
  if (headSha === null) return [];
  const raw = await readGit(gitClient, ["show", "-s", "--format=%P", headSha], cwd);
  if (raw === null || raw.trim().length === 0) return [];
  return raw.trim().split(/\s+/).filter((sha) => sha.length > 0);
}

async function readMergeInProgress(
  fs: FileSystem,
  gitClient: GitClient,
  cwd: string,
): Promise<boolean> {
  return (await readGitPathText(fs, gitClient, cwd, "MERGE_HEAD")) !== null;
}

async function readRebaseProgressState(
  fs: FileSystem,
  gitClient: GitClient,
  cwd: string,
): Promise<RebaseProgressState> {
  const mergeHead = await readGitPathText(fs, gitClient, cwd, "rebase-merge/head-name");
  if (mergeHead !== null) {
    return {
      inProgress: true,
      step: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-merge/msgnum")),
      total: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-merge/end")),
    };
  }

  const applyHead = await readGitPathText(fs, gitClient, cwd, "rebase-apply/head-name");
  if (applyHead !== null) {
    return {
      inProgress: true,
      step: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-apply/next")),
      total: parseOptionalInt(await readGitPathText(fs, gitClient, cwd, "rebase-apply/last")),
    };
  }

  const rebaseHead = await readGitPathText(fs, gitClient, cwd, "REBASE_HEAD");
  return {
    inProgress: rebaseHead !== null,
    step: null,
    total: null,
  };
}

async function readHeadReflog(fs: FileSystem, gitClient: GitClient, cwd: string): Promise<HeadReflogEntry | null> {
  const reflogPath = await readGit(gitClient, ["rev-parse", "--path-format=absolute", "--git-path", "logs/HEAD"], cwd);
  if (reflogPath === null) return null;

  try {
    const content = await fs.readFile(reflogPath, "utf-8");
    const lines = content.split(/\r?\n/).map((line) => line.trimEnd());
    let raw: string | null = null;
    for (let index = lines.length - 1; index >= 0; index--) {
      const line = lines[index];
      if (line !== undefined && line.length > 0) {
        raw = line;
        break;
      }
    }
    if (raw === null) return null;
    const [meta = "", subject = ""] = raw.split("\t");
    const tokens = meta.split(" ");
    const previousSha = tokens[0] ?? null;
    const nextSha = tokens[1] ?? null;
    const timestampToken = tokens.length >= 2 ? tokens[tokens.length - 2] : undefined;
    const timestampSec = timestampToken !== undefined ? Number.parseInt(timestampToken, 10) : Number.NaN;

    return {
      raw,
      previousSha: previousSha !== null && /^[0-9a-f]{40}$/i.test(previousSha) ? previousSha : null,
      nextSha: nextSha !== null && /^[0-9a-f]{40}$/i.test(nextSha) ? nextSha : null,
      timestampSec: Number.isFinite(timestampSec) ? timestampSec : null,
      subject,
    };
  } catch {
    return null;
  }
}

export async function isAncestor(
  gitClient: GitClient,
  cwd: string,
  possibleAncestor: string | null,
  possibleDescendant: string | null,
): Promise<boolean> {
  if (possibleAncestor === null || possibleDescendant === null) {
    return false;
  }
  const result = await gitClient.run({
    args: ["merge-base", "--is-ancestor", possibleAncestor, possibleDescendant],
    cwd,
  });
  return result.status === 0;
}

export async function captureSnapshot(cwd: string, fs: FileSystem, gitClient: GitClient): Promise<RepoSnapshot> {
  const headSha = await readGit(gitClient, ["rev-parse", "HEAD"], cwd);
  const statusLines = mergeStatusLines(
    headSha === null ? [] : await readGitLines(gitClient, ["diff-index", "--cached", "--find-renames", "--name-status", headSha, "--"], cwd),
    await readGitLines(gitClient, ["diff-files", "--find-renames", "--name-status", "--"], cwd),
    await readGitLines(gitClient, ["ls-files", "--others", "--exclude-standard"], cwd),
  );
  const counts = countStatusLines(statusLines);
  const unmergedPaths = await countUnmergedPaths(gitClient, cwd);
  const mergeInProgress = await readMergeInProgress(fs, gitClient, cwd);
  const rebase = await readRebaseProgressState(fs, gitClient, cwd);

  return {
    headRef: await readGit(gitClient, ["symbolic-ref", "--quiet", "--short", "HEAD"], cwd),
    headSha,
    parentShas: await readParentShas(gitClient, cwd, headSha),
    observedAt: new Date().toISOString(),
    statusLines,
    dirty: statusLines.length > 0,
    ...counts,
    unmergedPaths,
    mergeInProgress,
    rebase,
    headReflog: await readHeadReflog(fs, gitClient, cwd),
  };
}
