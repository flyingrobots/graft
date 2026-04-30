import * as crypto from "node:crypto";
import { fork, type ChildProcess } from "node:child_process";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import type { MonitorTickWorkerJob, MonitorTickWorkerResult } from "./monitor-tick-job.js";
import type { RepoToolWorkerJob, RepoToolWorkerResult } from "./repo-tool-job.js";
import type {
  ActiveWorkerTask,
  ChildProcessDaemonWorkerPoolOptions,
  DaemonWorkerCounts,
  DaemonWorkerPool,
  QueuedWorkerTask,
  WorkerMessage,
  WorkerState,
} from "./daemon-worker-types.js";

function defaultProcessPoolSize(): number {
  const parallelism = os.availableParallelism();
  return Math.max(1, Math.min(4, parallelism > 1 ? parallelism - 1 : 1));
}

function normalizeProcessPoolSize(value: number | undefined): number {
  if (value === undefined) return defaultProcessPoolSize();
  const normalized = Math.trunc(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("worker pool size must be a positive integer");
  }
  return normalized;
}

function isTypescriptModuleUrl(moduleUrl: string): boolean {
  return fileURLToPath(moduleUrl).endsWith(".ts");
}

export function daemonWorkerProcessPath(moduleUrl = import.meta.url): string {
  const extension = isTypescriptModuleUrl(moduleUrl) ? "ts" : "js";
  return fileURLToPath(new URL(`./daemon-worker-process.${extension}`, moduleUrl));
}

export function daemonWorkerExecArgv(moduleUrl = import.meta.url): string[] {
  return isTypescriptModuleUrl(moduleUrl) ? ["--import", "tsx"] : [];
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  child.kill();
  await new Promise<void>((resolve) => {
    child.once("exit", () => {
      resolve();
    });
  });
}

export class ChildProcessDaemonWorkerPool implements DaemonWorkerPool {
  private readonly size: number;
  private readonly workers = new Map<string, WorkerState>();
  private readonly queue: QueuedWorkerTask[] = [];
  private completedTasks = 0;
  private failedTasks = 0;
  private closing = false;

  constructor(options: ChildProcessDaemonWorkerPoolOptions = {}) {
    this.size = normalizeProcessPoolSize(options.size);
    for (let index = 0; index < this.size; index++) {
      this.spawnWorker();
    }
  }

  getCounts(): DaemonWorkerCounts {
    const busyWorkers = [...this.workers.values()].filter((workerState) => workerState.task !== null).length;
    return {
      mode: "child_processes",
      totalWorkers: this.workers.size,
      busyWorkers,
      idleWorkers: this.workers.size - busyWorkers,
      queuedTasks: this.queue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
    };
  }

  runMonitorTick(job: MonitorTickWorkerJob): Promise<MonitorTickWorkerResult> {
    if (this.closing) {
      return Promise.reject(new Error("daemon worker pool is closing"));
    }
    return new Promise<MonitorTickWorkerResult>((resolve, reject) => {
      this.queue.push({
        requestId: crypto.randomUUID(),
        kind: "monitor_tick",
        job,
        resolve,
        reject,
      });
      this.dispatch();
    });
  }

  runRepoTool(job: RepoToolWorkerJob): Promise<RepoToolWorkerResult> {
    if (this.closing) {
      return Promise.reject(new Error("daemon worker pool is closing"));
    }
    return new Promise<RepoToolWorkerResult>((resolve, reject) => {
      this.queue.push({
        requestId: crypto.randomUUID(),
        kind: "repo_tool",
        job,
        resolve,
        reject,
      });
      this.dispatch();
    });
  }

  async close(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    const pending = [...this.queue];
    this.queue.length = 0;
    for (const task of pending) {
      task.reject(new Error("daemon worker pool closed before task execution"));
    }
    const active = [...this.workers.values()].flatMap((workerState) => {
      return workerState.task === null ? [] : [workerState.task];
    });
    for (const task of active) {
      task.reject(new Error("daemon worker pool closed during task execution"));
    }
    await Promise.all([...this.workers.values()].map(async (workerState) => {
      await stopChild(workerState.child);
    }));
    this.workers.clear();
  }

  private spawnWorker(): void {
    const workerId = crypto.randomUUID();
    const child = fork(daemonWorkerProcessPath(), [], {
      cwd: process.cwd(),
      execArgv: daemonWorkerExecArgv(),
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    const workerState: WorkerState = {
      workerId,
      child,
      task: null,
    };
    child.on("message", (message: WorkerMessage) => {
      this.handleWorkerMessage(workerState, message);
    });
    child.on("error", (error: Error) => {
      this.handleWorkerFailure(workerState, error);
    });
    child.on("exit", (code) => {
      this.handleWorkerExit(workerState, code ?? 0);
    });
    this.workers.set(workerId, workerState);
    this.dispatch();
  }

  private dispatch(): void {
    for (const workerState of this.workers.values()) {
      if (workerState.task !== null) continue;
      const next = this.queue.shift();
      if (next === undefined) {
        return;
      }
      const activeTask: ActiveWorkerTask = {
        ...next,
        workerId: workerState.workerId,
      };
      workerState.task = activeTask;
      workerState.child.send({
        requestId: activeTask.requestId,
        kind: activeTask.kind,
        job: activeTask.job,
      });
    }
  }

  private handleWorkerMessage(workerState: WorkerState, message: WorkerMessage): void {
    const task = workerState.task;
    if (task?.requestId !== message.requestId) {
      return;
    }
    workerState.task = null;
    if (message.ok) {
      this.completedTasks++;
      if (task.kind === "monitor_tick") {
        task.resolve(message.result as MonitorTickWorkerResult);
      } else {
        task.resolve(message.result as RepoToolWorkerResult);
      }
    } else {
      this.failedTasks++;
      task.reject(new Error(message.error));
    }
    this.dispatch();
  }

  private handleWorkerFailure(workerState: WorkerState, error: Error): void {
    const task = workerState.task;
    workerState.task = null;
    if (task !== null) {
      this.failedTasks++;
      task.reject(error);
    }
  }

  private handleWorkerExit(workerState: WorkerState, code: number): void {
    const task = workerState.task;
    workerState.task = null;
    this.workers.delete(workerState.workerId);
    if (task !== null) {
      this.failedTasks++;
      task.reject(new Error(`daemon worker exited with code ${String(code)}`));
    }
    if (!this.closing) {
      this.spawnWorker();
    }
  }
}
