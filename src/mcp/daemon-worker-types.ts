import type { MonitorTickWorkerJob, MonitorTickWorkerResult } from "./monitor-tick-job.js";
import type { RepoToolWorkerJob, RepoToolWorkerResult } from "./repo-tool-job.js";
import type { ChildProcess } from "node:child_process";

export interface DaemonWorkerCounts {
  readonly mode: "inline" | "child_processes";
  readonly totalWorkers: number;
  readonly busyWorkers: number;
  readonly idleWorkers: number;
  readonly queuedTasks: number;
  readonly completedTasks: number;
  readonly failedTasks: number;
}

export interface DaemonWorkerPool {
  getCounts(): DaemonWorkerCounts;
  runMonitorTick(job: MonitorTickWorkerJob): Promise<MonitorTickWorkerResult>;
  runRepoTool(job: RepoToolWorkerJob): Promise<RepoToolWorkerResult>;
  close(): Promise<void>;
}

export interface ChildProcessDaemonWorkerPoolOptions {
  readonly size?: number | undefined;
}

export interface QueuedMonitorTask {
  readonly requestId: string;
  readonly kind: "monitor_tick";
  readonly job: MonitorTickWorkerJob;
  readonly resolve: (result: MonitorTickWorkerResult) => void;
  readonly reject: (reason?: unknown) => void;
}

export interface QueuedRepoToolTask {
  readonly requestId: string;
  readonly kind: "repo_tool";
  readonly job: RepoToolWorkerJob;
  readonly resolve: (result: RepoToolWorkerResult) => void;
  readonly reject: (reason?: unknown) => void;
}

export type QueuedWorkerTask = QueuedMonitorTask | QueuedRepoToolTask;

export type ActiveWorkerTask = QueuedWorkerTask & {
  readonly workerId: string;
};

export interface WorkerSuccessMessage {
  readonly requestId: string;
  readonly ok: true;
  readonly result: MonitorTickWorkerResult | RepoToolWorkerResult;
}

export interface WorkerFailureMessage {
  readonly requestId: string;
  readonly ok: false;
  readonly error: string;
}

export type WorkerMessage = WorkerSuccessMessage | WorkerFailureMessage;

export interface WorkerState {
  readonly workerId: string;
  readonly child: ChildProcess;
  task: ActiveWorkerTask | null;
}
