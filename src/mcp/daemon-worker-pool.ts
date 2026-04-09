import * as crypto from "node:crypto";
import { fork, type ChildProcess } from "node:child_process";
import * as os from "node:os";
import { fileURLToPath } from "node:url";
import { runMonitorTickJob, type MonitorTickWorkerJob, type MonitorTickWorkerResult } from "./monitor-tick-job.js";

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
  close(): Promise<void>;
}

export interface ChildProcessDaemonWorkerPoolOptions {
  readonly size?: number | undefined;
}

interface QueuedMonitorTask {
  readonly requestId: string;
  readonly job: MonitorTickWorkerJob;
  readonly resolve: (result: MonitorTickWorkerResult) => void;
  readonly reject: (reason?: unknown) => void;
}

interface ActiveMonitorTask extends QueuedMonitorTask {
  readonly workerId: string;
}

interface WorkerSuccessMessage {
  readonly requestId: string;
  readonly ok: true;
  readonly result: MonitorTickWorkerResult;
}

interface WorkerFailureMessage {
  readonly requestId: string;
  readonly ok: false;
  readonly error: string;
}

type WorkerMessage = WorkerSuccessMessage | WorkerFailureMessage;

interface WorkerState {
  readonly workerId: string;
  readonly child: ChildProcess;
  task: ActiveMonitorTask | null;
}

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

function daemonWorkerProcessPath(): string {
  return fileURLToPath(new URL("./daemon-worker-process.ts", import.meta.url));
}

export class InlineDaemonWorkerPool implements DaemonWorkerPool {
  private completedTasks = 0;
  private failedTasks = 0;

  getCounts(): DaemonWorkerCounts {
    return {
      mode: "inline",
      totalWorkers: 0,
      busyWorkers: 0,
      idleWorkers: 0,
      queuedTasks: 0,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
    };
  }

  async runMonitorTick(job: MonitorTickWorkerJob): Promise<MonitorTickWorkerResult> {
    try {
      const result = await runMonitorTickJob(job);
      this.completedTasks++;
      return result;
    } catch (error) {
      this.failedTasks++;
      throw error;
    }
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class ChildProcessDaemonWorkerPool implements DaemonWorkerPool {
  private readonly size: number;
  private readonly workers = new Map<string, WorkerState>();
  private readonly queue: QueuedMonitorTask[] = [];
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
      execArgv: ["--import", "tsx"],
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
      const activeTask: ActiveMonitorTask = {
        ...next,
        workerId: workerState.workerId,
      };
      workerState.task = activeTask;
      workerState.child.send({
        requestId: activeTask.requestId,
        kind: "monitor_tick",
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
      task.resolve(message.result);
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
