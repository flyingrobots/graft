import { indexHead } from "../warp/index-head.js";
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
    const result = await indexHead({
      cwd: job.worktreeRoot,
      git: nodeGit,
      pathOps: nodePathOps,
      ctx,
    });
    const currentHead = await readHeadCommit(job.worktreeRoot);
    return {
      ok: true,
      headAtStart,
      currentHead,
      lastIndexedCommit: headAtStart,
      backlogCommits: 0,
      commitsIndexed: result.filesIndexed,
      patchesWritten: result.nodesEmitted,
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
