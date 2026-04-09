import { runMonitorTickJob, type MonitorTickWorkerJob, type MonitorTickWorkerResult } from "./monitor-tick-job.js";

interface MonitorTickWorkerRequest {
  readonly requestId: string;
  readonly kind: "monitor_tick";
  readonly job: MonitorTickWorkerJob;
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

type WorkerRequest = MonitorTickWorkerRequest;
type WorkerResponse = WorkerSuccessMessage | WorkerFailureMessage;

process.on("message", (request: WorkerRequest) => {
  void (async () => {
    try {
      const result = await runMonitorTickJob(request.job);
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
