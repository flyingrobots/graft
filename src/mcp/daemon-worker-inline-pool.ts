import { runMonitorTickJob, type MonitorTickWorkerJob, type MonitorTickWorkerResult } from "./monitor-tick-job.js";
import { runRepoToolJob, type RepoToolWorkerJob, type RepoToolWorkerResult } from "./repo-tool-job.js";
import type { DaemonWorkerCounts, DaemonWorkerPool } from "./daemon-worker-types.js";

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

  async runRepoTool(job: RepoToolWorkerJob): Promise<RepoToolWorkerResult> {
    try {
      const result = await runRepoToolJob(job);
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
