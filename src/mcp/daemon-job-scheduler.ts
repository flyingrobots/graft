import * as crypto from "node:crypto";

export type DaemonJobKind = "repo_tool" | "persistent_monitor";
export type DaemonJobPriority = "interactive" | "background";
export type DaemonJobState = "queued" | "running";

export interface DaemonJobRequest {
  readonly sessionId: string | null;
  readonly sliceId: string | null;
  readonly repoId: string;
  readonly worktreeId: string | null;
  readonly tool: string;
  readonly kind: DaemonJobKind;
  readonly priority: DaemonJobPriority;
  readonly laneKey: string;
}

export interface DaemonJobView extends DaemonJobRequest {
  readonly jobId: string;
  readonly state: DaemonJobState;
  readonly enqueuedAt: string;
  readonly startedAt: string | null;
  readonly waitMs: number;
}

export interface DaemonSchedulerCounts {
  readonly maxConcurrentJobs: number;
  readonly activeJobs: number;
  readonly queuedJobs: number;
  readonly interactiveQueuedJobs: number;
  readonly backgroundQueuedJobs: number;
  readonly activeRepoLanes: number;
  readonly queuedRepoLanes: number;
  readonly completedJobs: number;
  readonly failedJobs: number;
  readonly longestQueuedWaitMs: number;
}

export interface DaemonJobSchedulerOptions {
  readonly maxConcurrentJobs?: number | undefined;
}

interface ScheduledJob extends DaemonJobRequest {
  readonly jobId: string;
  readonly enqueuedAtMs: number;
  readonly enqueuedAt: string;
  startedAtMs: number | null;
  startedAt: string | null;
  readonly run: () => Promise<unknown>;
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason?: unknown) => void;
}

const DEFAULT_MAX_CONCURRENT_JOBS = 2;

export const ZERO_SCHEDULER_COUNTS: DaemonSchedulerCounts = Object.freeze({
  maxConcurrentJobs: DEFAULT_MAX_CONCURRENT_JOBS,
  activeJobs: 0,
  queuedJobs: 0,
  interactiveQueuedJobs: 0,
  backgroundQueuedJobs: 0,
  activeRepoLanes: 0,
  queuedRepoLanes: 0,
  completedJobs: 0,
  failedJobs: 0,
  longestQueuedWaitMs: 0,
});

function normalizeMaxConcurrentJobs(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_CONCURRENT_JOBS;
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("maxConcurrentJobs must be a positive integer");
  }
  return normalized;
}

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

function compareRepoIds(left: string, right: string): number {
  return left.localeCompare(right);
}

function toJobView(job: ScheduledJob, nowMs: number, state: DaemonJobState): DaemonJobView {
  return {
    jobId: job.jobId,
    sessionId: job.sessionId,
    sliceId: job.sliceId,
    repoId: job.repoId,
    worktreeId: job.worktreeId,
    tool: job.tool,
    kind: job.kind,
    priority: job.priority,
    laneKey: job.laneKey,
    state,
    enqueuedAt: job.enqueuedAt,
    startedAt: job.startedAt,
    waitMs: (job.startedAtMs ?? nowMs) - job.enqueuedAtMs,
  };
}

export class DaemonJobScheduler {
  private readonly maxConcurrentJobs: number;
  private readonly interactiveQueues = new Map<string, ScheduledJob[]>();
  private readonly backgroundQueues = new Map<string, ScheduledJob[]>();
  private readonly running = new Map<string, ScheduledJob>();
  private completedJobs = 0;
  private failedJobs = 0;
  private lastInteractiveRepoId: string | null = null;
  private lastBackgroundRepoId: string | null = null;

  constructor(options: DaemonJobSchedulerOptions = {}) {
    this.maxConcurrentJobs = normalizeMaxConcurrentJobs(options.maxConcurrentJobs);
  }

  enqueue<T>(request: DaemonJobRequest, run: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const enqueuedAtMs = Date.now();
      const job: ScheduledJob = {
        ...request,
        jobId: crypto.randomUUID(),
        enqueuedAtMs,
        enqueuedAt: toIso(enqueuedAtMs),
        startedAtMs: null,
        startedAt: null,
        run: () => run(),
        resolve: (value) => {
          resolve(value as T);
        },
        reject,
      };
      this.enqueueJob(job);
      this.dispatch();
    });
  }

  getCounts(nowMs = Date.now()): DaemonSchedulerCounts {
    const queuedJobs = this.listQueuedJobs();
    const interactiveQueuedJobs = queuedJobs.filter((job) => job.priority === "interactive").length;
    const backgroundQueuedJobs = queuedJobs.length - interactiveQueuedJobs;
    const longestQueuedWaitMs = queuedJobs.reduce((maxWait, job) => {
      return Math.max(maxWait, nowMs - job.enqueuedAtMs);
    }, 0);

    return {
      maxConcurrentJobs: this.maxConcurrentJobs,
      activeJobs: this.running.size,
      queuedJobs: queuedJobs.length,
      interactiveQueuedJobs,
      backgroundQueuedJobs,
      activeRepoLanes: new Set([...this.running.values()].map((job) => job.repoId)).size,
      queuedRepoLanes: new Set(queuedJobs.map((job) => job.repoId)).size,
      completedJobs: this.completedJobs,
      failedJobs: this.failedJobs,
      longestQueuedWaitMs,
    };
  }

  listJobs(nowMs = Date.now()): readonly DaemonJobView[] {
    const runningJobs = [...this.running.values()]
      .map((job) => toJobView(job, nowMs, "running"))
      .sort((left, right) => {
        return (left.startedAt ?? left.enqueuedAt).localeCompare(right.startedAt ?? right.enqueuedAt);
      });
    const queuedJobs = this.listQueuedJobs()
      .map((job) => toJobView(job, nowMs, "queued"))
      .sort((left, right) => left.enqueuedAt.localeCompare(right.enqueuedAt));
    return [...runningJobs, ...queuedJobs];
  }

  private enqueueJob(job: ScheduledJob): void {
    const queues = this.getQueues(job.priority);
    const queue = queues.get(job.repoId) ?? [];
    queue.push(job);
    queues.set(job.repoId, queue);
  }

  private dispatch(): void {
    while (this.running.size < this.maxConcurrentJobs) {
      const nextJob = this.takeNextJob();
      if (nextJob === null) {
        return;
      }
      this.startJob(nextJob);
    }
  }

  private startJob(job: ScheduledJob): void {
    const startedAtMs = Date.now();
    job.startedAtMs = startedAtMs;
    job.startedAt = toIso(startedAtMs);
    this.running.set(job.jobId, job);

    void Promise.resolve()
      .then(() => job.run())
      .then((value) => {
        this.running.delete(job.jobId);
        this.completedJobs++;
        job.resolve(value);
        this.dispatch();
      })
      .catch((error: unknown) => {
        this.running.delete(job.jobId);
        this.failedJobs++;
        job.reject(error);
        this.dispatch();
      });
  }

  private takeNextJob(): ScheduledJob | null {
    return this.takeNextJobForPriority("interactive") ?? this.takeNextJobForPriority("background");
  }

  private takeNextJobForPriority(priority: DaemonJobPriority): ScheduledJob | null {
    const queues = this.getQueues(priority);
    return this.takeNextJobFromQueues(queues, priority, true)
      ?? this.takeNextJobFromQueues(queues, priority, false);
  }

  private takeNextJobFromQueues(
    queues: Map<string, ScheduledJob[]>,
    priority: DaemonJobPriority,
    avoidBusyRepos: boolean,
  ): ScheduledJob | null {
    const repoIds = [...queues.entries()]
      .filter(([repoId, queue]) => {
        return queue.length > 0 && (!avoidBusyRepos || !this.hasRunningRepo(repoId));
      })
      .map(([repoId]) => repoId)
      .sort(compareRepoIds);

    if (repoIds.length === 0) {
      return null;
    }

    const lastRepoId = priority === "interactive" ? this.lastInteractiveRepoId : this.lastBackgroundRepoId;
    const lastIndex = lastRepoId === null ? -1 : repoIds.indexOf(lastRepoId);
    const startIndex = lastIndex >= 0 ? (lastIndex + 1) % repoIds.length : 0;

    for (let offset = 0; offset < repoIds.length; offset++) {
      const repoId = repoIds[(startIndex + offset) % repoIds.length];
      if (repoId === undefined) continue;
      const queue = queues.get(repoId);
      const job = queue?.shift();
      if (job === undefined) continue;
      if (queue?.length === 0) {
        queues.delete(repoId);
      }
      if (priority === "interactive") {
        this.lastInteractiveRepoId = repoId;
      } else {
        this.lastBackgroundRepoId = repoId;
      }
      return job;
    }

    return null;
  }

  private listQueuedJobs(): ScheduledJob[] {
    return [
      ...this.interactiveQueues.values(),
      ...this.backgroundQueues.values(),
    ].flatMap((queue) => [...queue]);
  }

  private hasRunningRepo(repoId: string): boolean {
    return [...this.running.values()].some((job) => job.repoId === repoId);
  }

  private getQueues(priority: DaemonJobPriority): Map<string, ScheduledJob[]> {
    return priority === "interactive" ? this.interactiveQueues : this.backgroundQueues;
  }
}
