import { DEFAULT_INDEX_MAX_FILES_PER_CALL, indexHead } from "../warp/index-head.js";
import { nodeGit } from "../adapters/node-git.js";
import { nodePathOps } from "../adapters/node-paths.js";
import { openWarp } from "../warp/open.js";

export interface MonitorTickWorkerJob {
  readonly repoId: string;
  readonly worktreeRoot: string;
  readonly writerId: string;
  readonly lastIndexedCommit: string | null;
}

export type MonitorTickWorkerResult =
  | {
    readonly ok: true;
    readonly headAtStart: string | null;
    readonly currentHead: string | null;
    readonly lastIndexedCommit: string | null;
    readonly backlogCommits: number;
    readonly commitsIndexed: number;
    readonly patchesWritten: number;
  }
  | {
    readonly ok: false;
    readonly error: string;
    readonly currentHead: string | null;
    readonly backlogCommits: number;
  };

async function readHeadCommit(cwd: string): Promise<string | null> {
  const result = await nodeGit.run({ cwd, args: ["rev-parse", "--verify", "HEAD"] });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  const trimmed = result.stdout.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseGitPathList(output: string): readonly string[] {
  const seen = new Set<string>();
  const paths: string[] = [];
  for (const line of output.split("\n")) {
    const filePath = line.trim();
    if (filePath.length === 0 || seen.has(filePath)) continue;
    seen.add(filePath);
    paths.push(filePath);
  }
  return paths;
}

async function listTrackedPaths(cwd: string): Promise<readonly string[]> {
  const result = await nodeGit.run({ cwd, args: ["ls-files"] });
  if (result.error !== undefined || result.status !== 0) {
    throw result.error ?? new Error(result.stderr.trim() || `git ls-files exited with status ${String(result.status)}`);
  }
  return parseGitPathList(result.stdout);
}

async function listChangedPaths(cwd: string, base: string, head: string): Promise<readonly string[] | null> {
  const result = await nodeGit.run({ cwd, args: ["diff", "--name-only", `${base}..${head}`] });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  return parseGitPathList(result.stdout);
}

async function monitorIndexPaths(input: {
  readonly cwd: string;
  readonly currentHead: string | null;
  readonly lastIndexedCommit: string | null;
}): Promise<readonly string[]> {
  if (input.currentHead === null) return [];
  if (input.lastIndexedCommit !== null) {
    const changedPaths = await listChangedPaths(input.cwd, input.lastIndexedCommit, input.currentHead);
    if (changedPaths !== null) return changedPaths;
  }
  return listTrackedPaths(input.cwd);
}

function pathBatches(paths: readonly string[], size: number): readonly (readonly string[])[] {
  const batches: (readonly string[])[] = [];
  for (let index = 0; index < paths.length; index += size) {
    batches.push(paths.slice(index, index + size));
  }
  return batches;
}

export async function runMonitorTickJob(job: MonitorTickWorkerJob): Promise<MonitorTickWorkerResult> {
  const headAtStart = await readHeadCommit(job.worktreeRoot);

  // ── Tick ceiling: skip indexing when HEAD hasn't moved ───────────
  // When HEAD equals the last indexed commit (including both null for
  // empty repos), there is nothing to index. Short-circuit before
  // opening WARP or calling indexCommits to keep idle ticks near-zero-cost.
  if (headAtStart === job.lastIndexedCommit) {
    return {
      ok: true,
      headAtStart,
      currentHead: headAtStart,
      lastIndexedCommit: job.lastIndexedCommit,
      backlogCommits: 0,
      commitsIndexed: 0,
      patchesWritten: 0,
    };
  }

  try {
    const app = await openWarp({
      cwd: job.worktreeRoot,
      writerId: job.writerId,
    });
    const ctx = { app, strandId: null };
    const paths = await monitorIndexPaths({
      cwd: job.worktreeRoot,
      currentHead: headAtStart,
      lastIndexedCommit: job.lastIndexedCommit,
    });
    let commitsIndexed = 0;
    let patchesWritten = 0;
    for (const batch of pathBatches(paths, DEFAULT_INDEX_MAX_FILES_PER_CALL)) {
      const result = await indexHead({
        cwd: job.worktreeRoot,
        git: nodeGit,
        pathOps: nodePathOps,
        ctx,
        paths: batch,
        maxFilesPerCall: DEFAULT_INDEX_MAX_FILES_PER_CALL,
      });
      commitsIndexed += result.filesIndexed;
      patchesWritten += result.nodesEmitted;
    }
    const currentHead = await readHeadCommit(job.worktreeRoot);
    return {
      ok: true,
      headAtStart,
      currentHead,
      lastIndexedCommit: headAtStart,
      backlogCommits: 0,
      commitsIndexed,
      patchesWritten,
    };
  } catch (error) {
    const currentHead = await readHeadCommit(job.worktreeRoot);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      currentHead,
      backlogCommits: 0,
    };
  }
}
