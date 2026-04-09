import { runMonitorTickJob, type MonitorTickWorkerJob, type MonitorTickWorkerResult } from "./monitor-tick-job.js";
import { runRepoToolJob, type RepoToolWorkerJob, type RepoToolWorkerResult } from "./repo-tool-job.js";

interface MonitorTickWorkerRequest {
  readonly requestId: string;
  readonly kind: "monitor_tick";
  readonly job: MonitorTickWorkerJob;
}

interface RepoToolWorkerRequest {
  readonly requestId: string;
  readonly kind: "repo_tool";
  readonly job: RepoToolWorkerJob;
}

interface WorkerSuccessMessage {
  readonly requestId: string;
  readonly ok: true;
  readonly result: MonitorTickWorkerResult | RepoToolWorkerResult;
}

interface WorkerFailureMessage {
  readonly requestId: string;
  readonly ok: false;
  readonly error: string;
}

type WorkerRequest = MonitorTickWorkerRequest | RepoToolWorkerRequest;
type WorkerResponse = WorkerSuccessMessage | WorkerFailureMessage;

process.on("message", (request: WorkerRequest) => {
  void (async () => {
    try {
      const result = request.kind === "monitor_tick"
        ? await runMonitorTickJob(request.job)
        : await runRepoToolJob(request.job);
      const response: WorkerResponse = {
        requestId: request.requestId,
        ok: true,
        result,
      };
      process.send?.(response);
    } catch (error) {
      const response: WorkerResponse = {
        requestId: request.requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      process.send?.(response);
    }
  })();
});
