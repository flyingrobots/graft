import { indexCommits } from "../warp/indexer.js";
import { nodeGit } from "../adapters/node-git.js";
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

async function readGit(cwd: string, args: readonly string[]): Promise<string | null> {
  const result = await nodeGit.run({ cwd, args });
  if (result.error !== undefined || result.status !== 0) {
    return null;
  }
  const trimmed = result.stdout.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function readHeadCommit(cwd: string): Promise<string | null> {
  return readGit(cwd, ["rev-parse", "--verify", "HEAD"]);
}

async function countPendingCommits(
  cwd: string,
  from: string | null,
  to: string | null,
): Promise<number> {
  if (to === null) return 0;
  const range = from === null ? to : `${from}..${to}`;
  const output = await readGit(cwd, ["rev-list", "--count", range]);
  if (output === null) return 0;
  const parsed = Number.parseInt(output, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

export async function runMonitorTickJob(job: MonitorTickWorkerJob): Promise<MonitorTickWorkerResult> {
  const headAtStart = await readHeadCommit(job.worktreeRoot);

  try {
    const warp = await openWarp({
      cwd: job.worktreeRoot,
      writerId: job.writerId,
    });
    const result = await indexCommits(warp, {
      cwd: job.worktreeRoot,
      git: nodeGit,
      ...(job.lastIndexedCommit !== null ? { from: job.lastIndexedCommit } : {}),
      ...(headAtStart !== null ? { to: headAtStart } : {}),
    });
    if (!result.ok) {
      throw new Error(result.error);
    }
    const currentHead = await readHeadCommit(job.worktreeRoot);
    const lastIndexedCommit = headAtStart ?? job.lastIndexedCommit;
    const backlogCommits = await countPendingCommits(
      job.worktreeRoot,
      lastIndexedCommit,
      currentHead,
    );
    return {
      ok: true,
      headAtStart,
      currentHead,
      lastIndexedCommit,
      backlogCommits,
      commitsIndexed: result.commitsIndexed,
      patchesWritten: result.patchesWritten,
    };
  } catch (error) {
    const currentHead = await readHeadCommit(job.worktreeRoot);
    const backlogCommits = await countPendingCommits(
      job.worktreeRoot,
      job.lastIndexedCommit,
      currentHead,
    );
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      currentHead,
      backlogCommits,
    };
  }
}
