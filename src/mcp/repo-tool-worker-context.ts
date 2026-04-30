import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { nodeGit } from "../adapters/node-git.js";
import { nodeProcessRunner } from "../adapters/node-process-runner.js";
import { createRepoPathResolver } from "../adapters/repo-paths.js";
import { openWarp } from "../warp/open.js";
import { GovernorTracker } from "../session/tracker.js";
import { RefusedResult } from "../policy/types.js";
import type { WorkspaceStatus } from "./workspace-router.js";
import { buildReceiptResult } from "./receipt.js";
import type { ToolContext, ToolDefinition, ToolHandler } from "./context.js";
import { Metrics, diffMetrics } from "./metrics.js";
import { ObservationCache } from "./cache.js";
import { evaluateMcpPolicy } from "./policy.js";
import { resolveRunCaptureConfig } from "./run-capture-config.js";
import { resolveRuntimeObservabilityState } from "./runtime-observability.js";
import { buildRuntimeCausalContext } from "./runtime-causal-context.js";
import type { RepoToolWorkerJob, RepoToolWorkerResult } from "./repo-tool-job.js";

function unsupported(name: string): never {
  throw new Error(`${name} is not available in repo-tool worker mode`);
}

function workerStatus(job: RepoToolWorkerJob): WorkspaceStatus {
  return {
    sessionMode: "daemon",
    bindState: "bound",
    repoId: job.repoId,
    worktreeId: job.worktreeId,
    worktreeRoot: job.projectRoot,
    gitCommonDir: job.gitCommonDir,
    graftDir: job.graftDir,
    capabilityProfile: job.capabilityProfile,
  };
}

export function wrapWithPolicyCheck(
  toolName: ToolDefinition["name"],
  inner: ToolHandler,
): ToolHandler {
  return async (args: Record<string, unknown>, ctx: ToolContext) => {
    const rawPath = args["path"];
    if (typeof rawPath !== "string") return inner(args, ctx);

    const filePath = ctx.resolvePath(rawPath);
    let content: string;
    try {
      content = await ctx.fs.readFile(filePath, "utf-8");
    } catch {
      return inner(args, ctx);
    }

    const actual = { lines: content.split("\n").length, bytes: Buffer.byteLength(content) };
    const policy = evaluateMcpPolicy(ctx, filePath, actual);
    if (policy instanceof RefusedResult) {
      ctx.metrics.recordRefusal();
      return ctx.respond(toolName, {
        path: filePath,
        projection: "refused",
        reason: policy.reason,
        reasonDetail: policy.reasonDetail,
        next: [...policy.next],
        actual,
      });
    }
    return inner(args, ctx);
  };
}

export function buildRepoToolWorkerContext(
  job: RepoToolWorkerJob,
): { ctx: ToolContext; takeResponse: () => RepoToolWorkerResult } {
  const codec = new CanonicalJsonCodec();
  const governor = GovernorTracker.fromSnapshot(job.governorSnapshot);
  const metrics = Metrics.fromSnapshot(job.metricsSnapshot);
  const cache = ObservationCache.fromSnapshots(job.cacheSnapshots);
  const trackedCachePaths = new Set<string>(Object.keys(job.cacheSnapshots ?? {}));
  if (typeof job.args["path"] === "string") {
    trackedCachePaths.add(createRepoPathResolver(job.projectRoot)(job.args["path"]));
  }
  let response: Omit<RepoToolWorkerResult, "metricsDelta" | "cacheUpdates"> | null = null;

  const ctx: ToolContext = {
    projectRoot: job.projectRoot,
    graftDir: job.graftDir,
    graftignorePatterns: job.graftignorePatterns,
    governor,
    cache,
    metrics,
    fs: nodeFs,
    codec,
    process: nodeProcessRunner,
    git: nodeGit,
    runCapture: resolveRunCaptureConfig({}),
    observability: resolveRuntimeObservabilityState({ graftDir: job.graftDir }),
    respond(tool, data) {
      const tripwires = governor.checkTripwires();
      const built = buildReceiptResult(tool, data, {
        sessionId: job.sessionId,
        traceId: job.traceId,
        seq: job.seq,
        latencyMs: Date.now() - job.startedAtMs,
        codec,
        metrics: metrics.snapshot(),
        tripwires,
        budget: governor.getBudget(),
      });
      response = {
        result: built.result,
        textBytes: built.textBytes,
        receipt: built.receipt,
        tripwireSignals: tripwires.map((wire) => wire.signal),
      };
      return built.result;
    },
    recordFootprint() {
      // Worker-thread footprints are not collected — the main thread
      // captures footprint via AsyncLocalStorage in the invocation engine.
    },
    resolvePath: createRepoPathResolver(job.projectRoot),
    async getWarp() {
      return { app: await openWarp({ cwd: job.projectRoot, writerId: job.writerId }), strandId: null };
    },
    getRepoState() {
      return job.repoState;
    },
    getCausalContext() {
      return buildRuntimeCausalContext({
        transportSessionId: job.sessionId,
        workspaceSliceId: job.workspaceSliceId,
        repoId: job.repoId,
        worktreeId: job.worktreeId,
        checkoutEpoch: job.repoState.checkoutEpoch,
        warpWriterId: job.writerId,
      });
    },
    getPersistedLocalHistorySummary() {
      return unsupported("getPersistedLocalHistorySummary");
    },
    getPersistedLocalActivityWindow() {
      return unsupported("getPersistedLocalActivityWindow");
    },
    getRepoConcurrencySummary() {
      return Promise.resolve(null);
    },
    getWorkspaceOverlayFooting() {
      return unsupported("getWorkspaceOverlayFooting");
    },
    declareCausalAttach() {
      return unsupported("declareCausalAttach");
    },
    getWorkspaceStatus() {
      return workerStatus(job);
    },
    bindWorkspace() {
      return unsupported("bindWorkspace");
    },
    rebindWorkspace() {
      return unsupported("rebindWorkspace");
    },
    getDaemonStatus() {
      return unsupported("getDaemonStatus");
    },
    listDaemonRepos() {
      return unsupported("listDaemonRepos");
    },
    listDaemonSessions() {
      return unsupported("listDaemonSessions");
    },
    listDaemonMonitors() {
      return unsupported("listDaemonMonitors");
    },
    startMonitor() {
      return unsupported("startMonitor");
    },
    pauseMonitor() {
      return unsupported("pauseMonitor");
    },
    resumeMonitor() {
      return unsupported("resumeMonitor");
    },
    nudgeMonitor() {
      return unsupported("nudgeMonitor");
    },
    stopMonitor() {
      return unsupported("stopMonitor");
    },
    listWorkspaceAuthorizations() {
      return unsupported("listWorkspaceAuthorizations");
    },
    authorizeWorkspace() {
      return unsupported("authorizeWorkspace");
    },
    revokeWorkspace() {
      return unsupported("revokeWorkspace");
    },
  };

  return {
    ctx,
    takeResponse() {
      if (response === null) {
        throw new Error(`repo-tool worker ${job.tool} completed without calling respond()`);
      }
      return {
        ...response,
        metricsDelta: diffMetrics(job.metricsSnapshot, metrics.snapshot()),
        cacheUpdates: [...trackedCachePaths].map((filePath) => ({
          path: filePath,
          observation: cache.snapshotEntry(filePath),
        })),
      };
    },
  };
}
