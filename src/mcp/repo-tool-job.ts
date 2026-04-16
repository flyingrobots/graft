import { z } from "zod";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { nodeGit } from "../adapters/node-git.js";
import { nodeProcessRunner } from "../adapters/node-process-runner.js";
import { openWarp } from "../warp/open.js";
import { SessionTracker, type SessionTrackerSnapshot } from "../session/tracker.js";
import { buildReceiptResult, type McpToolReceipt, type McpToolResult } from "./receipt.js";
import type { ToolContext, ToolDefinition, ToolHandler } from "./context.js";
import { resolveRunCaptureConfig } from "./run-capture-config.js";
import { resolveRuntimeObservabilityState } from "./runtime-observability.js";
import { Metrics, diffMetrics, type MetricsDelta, type MetricsSnapshot } from "./metrics.js";
import { ObservationCache, type ObservationSnapshot } from "./cache.js";
import { createRepoPathResolver } from "../adapters/repo-paths.js";
import type { RepoObservation } from "./repo-state.js";
import type { WorkspaceCapabilityProfile, WorkspaceStatus } from "./workspace-router.js";
import { evaluateMcpPolicy } from "./policy.js";
import { RefusedResult } from "../policy/types.js";
import { graftDiffTool } from "./tools/graft-diff.js";
import { sinceTool } from "./tools/since.js";
import { mapTool } from "./tools/map.js";
import { codeRefsTool } from "./tools/code-refs.js";
import { codeFindTool, runCodeFind } from "./tools/code-find.js";
import { codeShowTool, runCodeShow } from "./tools/code-show.js";
import { safeReadTool } from "./tools/safe-read.js";
import { fileOutlineTool } from "./tools/file-outline.js";
import { changedSinceTool } from "./tools/changed-since.js";
import { buildRuntimeCausalContext } from "./runtime-causal-context.js";

const codeFindLiveWorkerTool: ToolDefinition = {
  ...codeFindTool,
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => runCodeFind(ctx, args, { allowWarp: false });
  },
};

const codeShowLiveWorkerTool: ToolDefinition = {
  ...codeShowTool,
  createHandler(ctx: ToolContext): ToolHandler {
    return (args) => runCodeShow(ctx, args, { allowWarp: false });
  },
};

const OFFLOADED_REPO_TOOL_DEFINITIONS = Object.freeze({
  safe_read: safeReadTool,
  file_outline: fileOutlineTool,
  changed_since: changedSinceTool,
  graft_diff: graftDiffTool,
  graft_since: sinceTool,
  graft_map: mapTool,
  code_refs: codeRefsTool,
  code_find_live: codeFindLiveWorkerTool,
  code_show_live: codeShowLiveWorkerTool,
});

export type OffloadedRepoToolName = keyof typeof OFFLOADED_REPO_TOOL_DEFINITIONS;

export const OFFLOADED_DAEMON_REPO_TOOL_NAMES = Object.freeze(
  Object.keys(OFFLOADED_REPO_TOOL_DEFINITIONS) as OffloadedRepoToolName[],
);

export interface RepoToolWorkerJob {
  readonly sessionId: string;
  readonly workspaceSliceId: string;
  readonly traceId: string;
  readonly seq: number;
  readonly startedAtMs: number;
  readonly tool: OffloadedRepoToolName;
  readonly args: Record<string, unknown>;
  readonly projectRoot: string;
  readonly graftDir: string;
  readonly graftignorePatterns: readonly string[];
  readonly repoId: string;
  readonly worktreeId: string;
  readonly gitCommonDir: string;
  readonly writerId: string;
  readonly capabilityProfile: WorkspaceCapabilityProfile;
  readonly repoState: RepoObservation;
  readonly sessionSnapshot: SessionTrackerSnapshot;
  readonly metricsSnapshot: MetricsSnapshot;
  readonly cacheSnapshots?: Readonly<Record<string, ObservationSnapshot>>;
}

export interface RepoToolWorkerResult {
  readonly result: McpToolResult;
  readonly textBytes: number;
  readonly receipt: McpToolReceipt;
  readonly tripwireSignals: readonly string[];
  readonly metricsDelta: MetricsDelta;
  readonly cacheUpdates: readonly {
    path: string;
    observation: ObservationSnapshot | null;
  }[];
}

function unsupported(name: string): never {
  throw new Error(`${name} is not available in repo-tool worker mode`);
}

function wrapWithPolicyCheck(toolName: ToolDefinition["name"], inner: ToolHandler, ctx: ToolContext): ToolHandler {
  return async (args: Record<string, unknown>) => {
    const rawPath = args["path"];
    if (typeof rawPath !== "string") return inner(args);

    const filePath = ctx.resolvePath(rawPath);
    let content: string;
    try {
      content = await ctx.fs.readFile(filePath, "utf-8");
    } catch {
      return inner(args);
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
    return inner(args);
  };
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

function buildWorkerContext(
  job: RepoToolWorkerJob,
): { ctx: ToolContext; metrics: Metrics; session: SessionTracker; takeResponse: () => RepoToolWorkerResult } {
  const codec = new CanonicalJsonCodec();
  const session = SessionTracker.fromSnapshot(job.sessionSnapshot);
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
    session,
    cache,
    metrics,
    fs: nodeFs,
    codec,
    process: nodeProcessRunner,
    git: nodeGit,
    runCapture: resolveRunCaptureConfig({}),
    observability: resolveRuntimeObservabilityState({ graftDir: job.graftDir }),
    respond(tool, data) {
      const tripwires = session.checkTripwires();
      const built = buildReceiptResult(tool, data, {
        sessionId: job.sessionId,
        traceId: job.traceId,
        seq: job.seq,
        latencyMs: Date.now() - job.startedAtMs,
        codec,
        metrics: metrics.snapshot(),
        tripwires,
        budget: session.getBudget(),
      });
      response = {
        result: built.result,
        textBytes: built.textBytes,
        receipt: built.receipt,
        tripwireSignals: tripwires.map((wire) => wire.signal),
      };
      return built.result;
    },
    resolvePath: createRepoPathResolver(job.projectRoot),
    getWarp() {
      return openWarp({ cwd: job.projectRoot, writerId: job.writerId });
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
    metrics,
    session,
    takeResponse() {
      if (response === null) {
        throw new Error(`repo-tool worker ${job.tool} completed without calling respond()`);
      }
      return {
        ...response,
        metricsDelta: diffMetrics(job.metricsSnapshot, metrics.snapshot()),
        cacheUpdates: [...trackedCachePaths].map((filePath) => {
          return {
            path: filePath,
            observation: cache.snapshotEntry(filePath),
          };
        }),
      };
    },
  };
}

function resolveRepoToolDefinition(tool: OffloadedRepoToolName): ToolDefinition {
  return OFFLOADED_REPO_TOOL_DEFINITIONS[tool];
}

export async function runRepoToolJob(job: RepoToolWorkerJob): Promise<RepoToolWorkerResult> {
  const definition = resolveRepoToolDefinition(job.tool);
  const { ctx, takeResponse } = buildWorkerContext(job);
  const rawHandler = definition.createHandler(ctx);
  const handler = definition.policyCheck === true ? wrapWithPolicyCheck(definition.name, rawHandler, ctx) : rawHandler;

  if (definition.schema !== undefined) {
    z.object(definition.schema).strict().parse(job.args);
  }

  await handler(job.args);
  return takeResponse();
}
