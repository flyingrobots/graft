import { AsyncLocalStorage } from "node:async_hooks";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildReceiptResult } from "./receipt.js";
import type { ToolHandler, ToolContext, ToolDefinition } from "./context.js";
import type { McpToolResult } from "./receipt.js";
import { evaluateMcpPolicy } from "./policy.js";
import { nodeFs } from "../adapters/node-fs.js";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeProcessRunner } from "../adapters/node-process-runner.js";
import { nodeGit } from "../adapters/node-git.js";
import { RefusedResult } from "../policy/types.js";
import type WarpApp from "@git-stunts/git-warp";
import { openWarp } from "../warp/open.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import { resolveRunCaptureConfig } from "./run-capture-config.js";
import {
  WorkspaceBindingRequiredError,
  WorkspaceCapabilityDeniedError,
  WorkspaceRouter,
  type WorkspaceExecutionContext,
  type WorkspaceSessionMode,
} from "./workspace-router.js";
import { DaemonControlPlane, type DaemonRuntimeDescriptor } from "./daemon-control-plane.js";
import { DaemonRepoOverview } from "./daemon-repos.js";
import { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import { InlineDaemonWorkerPool, type DaemonWorkerPool } from "./daemon-worker-pool.js";
import { PersistentMonitorRuntime } from "./persistent-monitor-runtime.js";
import { OFFLOADED_DAEMON_REPO_TOOL_NAMES, type OffloadedRepoToolName } from "./repo-tool-job.js";
import {
  RuntimeEventLogger,
  classifyRuntimeFailure,
  ensureGraftDirExcluded,
  resolveRuntimeObservabilityState,
  sanitizeArgKeys,
  type RuntimeObservabilityState,
} from "./runtime-observability.js";
import { InMemoryWarpPool, type WarpPool } from "./warp-pool.js";
import { buildSessionWarpWriterId } from "../warp/writer-id.js";
import { PersistedLocalHistoryStore } from "./persisted-local-history.js";

// Tool definitions — each file exports a ToolDefinition object
import { safeReadTool } from "./tools/safe-read.js";
import { fileOutlineTool } from "./tools/file-outline.js";
import { readRangeTool } from "./tools/read-range.js";
import { changedSinceTool } from "./tools/changed-since.js";
import { graftDiffTool } from "./tools/graft-diff.js";
import { runCaptureTool } from "./tools/run-capture.js";
import { stateSaveTool, stateLoadTool } from "./tools/state.js";
import { doctorTool } from "./tools/doctor.js";
import { statsTool } from "./tools/stats.js";
import { explainTool } from "./tools/explain.js";
import { setBudgetTool } from "./tools/budget.js";
import { sinceTool } from "./tools/since.js";
import { mapTool } from "./tools/map.js";
import { codeShowTool } from "./tools/code-show.js";
import { codeFindTool } from "./tools/code-find.js";
import { codeRefsTool } from "./tools/code-refs.js";
import { daemonMonitorsTool } from "./tools/daemon-monitors.js";
import { daemonReposTool } from "./tools/daemon-repos.js";
import { daemonSessionsTool } from "./tools/daemon-sessions.js";
import { daemonStatusTool } from "./tools/daemon-status.js";
import { monitorPauseTool } from "./tools/monitor-pause.js";
import { monitorResumeTool } from "./tools/monitor-resume.js";
import { monitorStartTool } from "./tools/monitor-start.js";
import { monitorStopTool } from "./tools/monitor-stop.js";
import { causalStatusTool } from "./tools/causal-status.js";
import { causalAttachTool } from "./tools/causal-attach.js";
import { workspaceAuthorizeTool } from "./tools/workspace-authorize.js";
import { workspaceAuthorizationsTool } from "./tools/workspace-authorizations.js";
import { workspaceBindTool } from "./tools/workspace-bind.js";
import { workspaceRevokeTool } from "./tools/workspace-revoke.js";
import { workspaceStatusTool } from "./tools/workspace-status.js";
import { workspaceRebindTool } from "./tools/workspace-rebind.js";

export type { McpToolResult, ToolHandler, ToolContext };

/** All registered tool definitions. Add new tools here. */
export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  safeReadTool,
  fileOutlineTool,
  readRangeTool,
  changedSinceTool,
  graftDiffTool,
  runCaptureTool,
  stateSaveTool,
  stateLoadTool,
  doctorTool,
  causalStatusTool,
  causalAttachTool,
  statsTool,
  explainTool,
  setBudgetTool,
  sinceTool,
  mapTool,
  codeShowTool,
  codeFindTool,
  codeRefsTool,
];

export const DAEMON_TOOL_REGISTRY: readonly ToolDefinition[] = [
  daemonReposTool,
  daemonStatusTool,
  daemonSessionsTool,
  daemonMonitorsTool,
  monitorStartTool,
  monitorPauseTool,
  monitorResumeTool,
  monitorStopTool,
  workspaceAuthorizeTool,
  workspaceAuthorizationsTool,
  workspaceRevokeTool,
  workspaceBindTool,
  workspaceStatusTool,
  workspaceRebindTool,
];

export const ALL_TOOL_REGISTRY: readonly ToolDefinition[] = [
  ...TOOL_REGISTRY,
  ...DAEMON_TOOL_REGISTRY,
];

export interface GraftServer {
  getRegisteredTools(): string[];
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  injectSessionMessages(count: number): void;
  getWorkspaceStatus(): import("./workspace-router.js").WorkspaceStatus;
  getMcpServer(): McpServer;
}

export interface CreateGraftServerOptions {
  mode?: WorkspaceSessionMode;
  projectRoot?: string;
  graftDir?: string;
  env?: Readonly<Record<string, string | undefined>>;
  runCapture?: Partial<RunCaptureConfig>;
  runtimeObservability?: Partial<RuntimeObservabilityState>;
  warpPool?: WarpPool;
  daemonControlPlane?: DaemonControlPlane;
  monitorRuntime?: PersistentMonitorRuntime;
  daemonScheduler?: DaemonJobScheduler;
  daemonWorkerPool?: DaemonWorkerPool;
  daemonRuntime?: (() => DaemonRuntimeDescriptor) | undefined;
}

export function createGraftServer(options: CreateGraftServerOptions = {}): GraftServer {
  const mcpServer = new McpServer({ name: "graft", version: "0.0.0" });
  const sessionId = crypto.randomUUID();
  const mode = options.mode ?? "repo_local";
  const sessionWarpWriterId = mode === "daemon" ? buildSessionWarpWriterId(sessionId) : undefined;
  const projectRoot = mode === "repo_local" ? (options.projectRoot ?? process.cwd()) : options.projectRoot;
  const graftDir = options.graftDir
    ?? (mode === "repo_local" && projectRoot !== undefined ? path.join(projectRoot, ".graft") : undefined);
  if (graftDir === undefined) {
    throw new Error("daemon mode requires an explicit graftDir");
  }
  const codec = new CanonicalJsonCodec();
  const runCapture = resolveRunCaptureConfig({
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(options.runCapture !== undefined ? { overrides: options.runCapture } : {}),
  });
  const observability = resolveRuntimeObservabilityState({
    graftDir,
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(options.runtimeObservability !== undefined ? { overrides: options.runtimeObservability } : {}),
  });
  const runtimeLogger = new RuntimeEventLogger({
    fs: nodeFs,
    codec,
    logPath: observability.logPath,
    maxBytes: observability.maxBytes,
  });
  const warpPool = options.warpPool ?? new InMemoryWarpPool((cwd, writerId) => openWarp({ cwd, writerId }));
  const persistedLocalHistory = new PersistedLocalHistoryStore({
    fs: nodeFs,
    codec,
    graftDir,
  });
  const daemonScheduler = mode === "daemon" ? (options.daemonScheduler ?? new DaemonJobScheduler()) : null;
  const daemonWorkerPool = mode === "daemon" ? (options.daemonWorkerPool ?? new InlineDaemonWorkerPool()) : null;
  const daemonControlPlane = mode === "daemon"
    ? (options.daemonControlPlane ?? new DaemonControlPlane({
      fs: nodeFs,
      codec,
      git: nodeGit,
      graftDir,
    }))
    : null;
  const monitorRuntime = mode !== "daemon" || daemonControlPlane === null || daemonScheduler === null || daemonWorkerPool === null
    ? null
    : (options.monitorRuntime ?? new PersistentMonitorRuntime({
      fs: nodeFs,
      codec,
      git: nodeGit,
      graftDir,
      controlPlane: daemonControlPlane,
      scheduler: daemonScheduler,
      workerPool: daemonWorkerPool,
    }));
  const daemonStartedAt = new Date().toISOString();
  const daemonRuntime = options.daemonRuntime ?? (() => {
    return {
      transport: "unix_socket",
      sameUserOnly: true,
      socketPath: graftDir,
      mcpPath: "/mcp",
      healthPath: "/healthz",
      activeWarpRepos: warpPool.size(),
      startedAt: daemonStartedAt,
    };
  });
  const handlers = new Map<string, ToolHandler>();
  const schemas = new Map<string, z.ZodObject>();
  const executionContextStorage = new AsyncLocalStorage<WorkspaceExecutionContext>();
  const invocationStorage = new AsyncLocalStorage<{
    readonly traceId: string;
    readonly startedAtMs: number;
    response?: { readonly receipt: import("./receipt.js").McpToolReceipt; readonly tripwireSignals: readonly string[] };
  }>();
  let seq = 0;
  const workspaceRouter = new WorkspaceRouter({
    mode,
    fs: nodeFs,
    git: nodeGit,
    graftDir,
    ...(projectRoot !== undefined ? { projectRoot } : {}),
    warpPool,
    transportSessionId: sessionId,
    ...(sessionWarpWriterId !== undefined ? { warpWriterId: sessionWarpWriterId } : {}),
    ...(daemonControlPlane !== null ? { authorizationPolicy: daemonControlPlane } : {}),
    persistedLocalHistory,
  });
  const daemonRepoOverview = daemonControlPlane !== null && monitorRuntime !== null
    ? new DaemonRepoOverview({
      controlPlane: daemonControlPlane,
      monitorRuntime,
    })
    : null;
  const runtimeReady = (async () => {
    if (mode === "repo_local" && projectRoot !== undefined) {
      await ensureGraftDirExcluded(projectRoot, graftDir, nodeFs);
    }
    await workspaceRouter.initialize();
    await Promise.all([
      daemonControlPlane?.initialize() ?? Promise.resolve(),
      monitorRuntime?.initialize() ?? Promise.resolve(),
    ]);
  })().then(() => undefined);

  async function emitRuntimeEvent(event: Parameters<RuntimeEventLogger["log"]>[0]): Promise<void> {
    try {
      await runtimeReady;
      await runtimeLogger.log(event);
    } catch {
      // Observability must never become the reason a tool call fails.
    }
  }

  function getActiveExecutionContext(): WorkspaceExecutionContext | null {
    return executionContextStorage.getStore() ?? null;
  }

  function respond(tool: ToolDefinition["name"], data: Record<string, unknown>): McpToolResult {
    const invocation = invocationStorage.getStore();
    if (invocation === undefined) {
      throw new Error("MCP respond() called outside an active invocation");
    }
    seq++;
    const execution = getActiveExecutionContext();
    const session = execution?.session ?? workspaceRouter.session;
    const metrics = execution?.metrics ?? workspaceRouter.metrics;
    const tripwires = session.checkTripwires();
    const { result, textBytes, receipt } = buildReceiptResult(tool, data, {
      sessionId,
      traceId: invocation.traceId,
      seq,
      latencyMs: Date.now() - invocation.startedAtMs,
      codec,
      metrics: metrics.snapshot(),
      tripwires,
      budget: session.getBudget(),
    });
    invocation.response = {
      receipt,
      tripwireSignals: tripwires.map((wire) => wire.signal),
    };
    metrics.recordToolResult(tool, textBytes);
    session.recordBytesConsumed(textBytes);
    return result;
  }

  const ctx: ToolContext = {
    get projectRoot(): string {
      return getActiveExecutionContext()?.projectRoot ?? workspaceRouter.getProjectRoot();
    },
    get graftDir(): string {
      return getActiveExecutionContext()?.graftDir ?? workspaceRouter.graftDir;
    },
    get graftignorePatterns(): readonly string[] {
      return getActiveExecutionContext()?.graftignorePatterns ?? workspaceRouter.getGraftignorePatterns();
    },
    get session() {
      return getActiveExecutionContext()?.session ?? workspaceRouter.session;
    },
    get cache() {
      return getActiveExecutionContext()?.cache ?? workspaceRouter.cache;
    },
    get metrics() {
      return getActiveExecutionContext()?.metrics ?? workspaceRouter.metrics;
    },
    respond,
    resolvePath(relative: string): string {
      return getActiveExecutionContext()?.resolvePath(relative) ?? workspaceRouter.getPathResolver()(relative);
    },
    fs: nodeFs,
    codec,
    process: nodeProcessRunner,
    git: nodeGit,
    runCapture,
    observability,
    getWarp(): Promise<WarpApp> {
      return getActiveExecutionContext()?.getWarp() ?? workspaceRouter.getWarp();
    },
    getRepoState() {
      return getActiveExecutionContext()?.repoState.getState() ?? workspaceRouter.getRepoState();
    },
    getCausalContext() {
      return getActiveExecutionContext()?.getCausalContext() ?? workspaceRouter.captureExecutionContext().getCausalContext();
    },
    getPersistedLocalHistorySummary() {
      return workspaceRouter.getPersistedLocalHistorySummary();
    },
    declareCausalAttach(request) {
      return workspaceRouter.declareAttach(request);
    },
    getWorkspaceStatus() {
      return getActiveExecutionContext()?.status ?? workspaceRouter.getStatus();
    },
    bindWorkspace(request, actionName) {
      return workspaceRouter.bind(request, actionName);
    },
    rebindWorkspace(request, actionName) {
      return workspaceRouter.rebind(request, actionName);
    },
    getDaemonStatus() {
      if (daemonControlPlane === null) {
        throw new Error("daemon_status is only available in daemon mode");
      }
      if (daemonScheduler === null) {
        throw new Error("daemon_status is only available in daemon mode");
      }
      if (daemonWorkerPool === null) {
        throw new Error("daemon_status is only available in daemon mode");
      }
      return Promise.resolve(daemonControlPlane.getStatus(
        daemonRuntime(),
        monitorRuntime?.getCounts(),
        daemonScheduler.getCounts(),
        daemonWorkerPool.getCounts(),
      ));
    },
    listDaemonRepos(filter) {
      if (daemonRepoOverview === null) {
        throw new Error("daemon_repos is only available in daemon mode");
      }
      return daemonRepoOverview.list(filter);
    },
    listDaemonSessions() {
      if (daemonControlPlane === null) {
        throw new Error("daemon_sessions is only available in daemon mode");
      }
      return Promise.resolve(daemonControlPlane.listSessions());
    },
    listDaemonMonitors() {
      if (monitorRuntime === null) {
        throw new Error("daemon_monitors is only available in daemon mode");
      }
      return monitorRuntime.listStatuses();
    },
    startMonitor(request) {
      if (monitorRuntime === null) {
        throw new Error("monitor_start is only available in daemon mode");
      }
      return monitorRuntime.startMonitor(request);
    },
    pauseMonitor(request) {
      if (monitorRuntime === null) {
        throw new Error("monitor_pause is only available in daemon mode");
      }
      return monitorRuntime.pauseMonitor(request);
    },
    resumeMonitor(request) {
      if (monitorRuntime === null) {
        throw new Error("monitor_resume is only available in daemon mode");
      }
      return monitorRuntime.resumeMonitor(request);
    },
    stopMonitor(request) {
      if (monitorRuntime === null) {
        throw new Error("monitor_stop is only available in daemon mode");
      }
      return monitorRuntime.stopMonitor(request);
    },
    listWorkspaceAuthorizations() {
      if (daemonControlPlane === null) {
        throw new Error("workspace_authorizations is only available in daemon mode");
      }
      return daemonControlPlane.listAuthorizedWorkspaces();
    },
    authorizeWorkspace(request) {
      if (daemonControlPlane === null) {
        throw new Error("workspace_authorize is only available in daemon mode");
      }
      return daemonControlPlane.authorizeWorkspace(request);
    },
    revokeWorkspace(request) {
      if (daemonControlPlane === null) {
        throw new Error("workspace_revoke is only available in daemon mode");
      }
      return daemonControlPlane.revokeWorkspace(request);
    },
  };

  const daemonAlwaysAvailableTools = new Set<string>([
    "daemon_repos",
    "daemon_status",
    "daemon_sessions",
    "daemon_monitors",
    "monitor_start",
    "monitor_pause",
    "monitor_resume",
    "monitor_stop",
    "workspace_authorize",
    "workspace_authorizations",
    "workspace_revoke",
    "workspace_bind",
    "workspace_status",
    "causal_status",
    "workspace_rebind",
    "explain",
  ]);

  const repoStateOptionalTools = new Set<string>([
    "daemon_repos",
    "daemon_status",
    "daemon_sessions",
    "daemon_monitors",
    "monitor_start",
    "monitor_pause",
    "monitor_resume",
    "monitor_stop",
    "workspace_authorize",
    "workspace_authorizations",
    "workspace_revoke",
    "workspace_bind",
    "workspace_status",
    "workspace_rebind",
    "explain",
  ]);

  function enforceDaemonToolAccess(name: string): void {
    if (mode !== "daemon") return;
    if (daemonAlwaysAvailableTools.has(name)) {
      return;
    }
    if (!workspaceRouter.isBound()) {
      throw new WorkspaceBindingRequiredError(name);
    }
    if (name === "run_capture" && workspaceRouter.getStatus().capabilityProfile?.runCapture !== true) {
      throw new WorkspaceCapabilityDeniedError(name);
    }
  }

  const daemonScheduledRepoTools = new Set<string>([
    "safe_read",
    "file_outline",
    "changed_since",
    "graft_diff",
    "graft_since",
    "graft_map",
    "code_show",
    "code_find",
    "code_refs",
  ]);
  const daemonOffloadedRepoTools = new Set<string>(OFFLOADED_DAEMON_REPO_TOOL_NAMES);
  const attributedReadTools = new Set<string>([
    "safe_read",
    "file_outline",
    "read_range",
  ]);

  function isOffloadedRepoTool(name: string): name is OffloadedRepoToolName {
    return daemonOffloadedRepoTools.has(name);
  }

  function resolveDaemonOffloadedRepoTool(
    name: string,
    parsed: Record<string, unknown>,
    dirty: boolean,
  ): OffloadedRepoToolName | null {
    if (name === "code_find") {
      return dirty ? "code_find_live" : null;
    }
    if (name === "code_show") {
      return parsed["ref"] === undefined ? "code_show_live" : null;
    }
    return isOffloadedRepoTool(name) ? name : null;
  }

  function parseToolPayload(result: McpToolResult): Record<string, unknown> | null {
    const textBlock = result.content.find((entry) => entry.type === "text");
    if (textBlock === undefined) {
      return null;
    }
    try {
      return JSON.parse(textBlock.text) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async function invokeTool(
    name: string,
    handler: ToolHandler,
    args: Record<string, unknown>,
    schema?: z.ZodObject,
  ): Promise<McpToolResult> {
    await runtimeReady;
    workspaceRouter.session.recordMessage();
    workspaceRouter.session.recordToolCall(name);
    const traceId = crypto.randomUUID();
    const startedAtMs = Date.now();
    const argKeys = sanitizeArgKeys(args);

    if (observability.enabled) {
      await emitRuntimeEvent({
        event: "tool_call_started",
        sessionId,
        traceId,
        tool: name,
        argKeys,
        sessionDepth: workspaceRouter.session.getSessionDepth(),
      });
    }

    const invocation = { traceId, startedAtMs } as {
      readonly traceId: string;
      readonly startedAtMs: number;
      response?: { readonly receipt: import("./receipt.js").McpToolReceipt; readonly tripwireSignals: readonly string[] };
    };
    let execution: WorkspaceExecutionContext | null = null;

    try {
      const parsed: Record<string, unknown> = schema !== undefined ? schema.parse(args) : args;
      enforceDaemonToolAccess(name);

      execution = daemonScheduler !== null
        && workspaceRouter.isBound()
        && daemonScheduledRepoTools.has(name)
        ? workspaceRouter.captureExecutionContext()
        : null;

      const executeHandler = async (): Promise<McpToolResult> => {
        return invocationStorage.run(invocation, async () => {
          if (execution !== null) {
            const activeExecution = execution;
            return executionContextStorage.run(activeExecution, async () => {
              if (!repoStateOptionalTools.has(name)) {
                await activeExecution.repoState.observe();
              }
              return handler(parsed);
            });
          }
          if (workspaceRouter.isBound() && !repoStateOptionalTools.has(name)) {
            await workspaceRouter.observeRepoState();
          }
          return handler(parsed);
        });
      };

      const result = execution !== null && daemonScheduler !== null
        ? await daemonScheduler.enqueue({
          sessionId,
          sliceId: execution.sliceId,
          repoId: execution.repoId,
          worktreeId: execution.worktreeId,
          tool: name,
          kind: "repo_tool",
          priority: "interactive",
          writerId: execution.warpWriterId,
        }, async () => {
          const activeExecution = execution;
          if (activeExecution !== null && daemonWorkerPool !== null) {
            await activeExecution.repoState.observe();
            const offloadedTool = resolveDaemonOffloadedRepoTool(
              name,
              parsed,
              activeExecution.repoState.getState().dirty,
            );
            if (offloadedTool === null) {
              return executeHandler();
            }
            const cacheSnapshots = typeof parsed["path"] === "string"
              ? (() => {
                const filePath = activeExecution.resolvePath(parsed["path"]);
                const snapshot = activeExecution.cache.snapshotEntry(filePath);
                return snapshot === null ? {} : { [filePath]: snapshot };
              })()
              : undefined;
            const workerResult = await daemonWorkerPool.runRepoTool({
              sessionId,
              workspaceSliceId: activeExecution.sliceId,
              traceId,
              seq: ++seq,
              startedAtMs,
              tool: offloadedTool,
              args: parsed,
              projectRoot: activeExecution.projectRoot,
              graftDir: activeExecution.graftDir,
              graftignorePatterns: activeExecution.graftignorePatterns,
              repoId: activeExecution.repoId,
              worktreeId: activeExecution.worktreeId,
              gitCommonDir: activeExecution.gitCommonDir,
              writerId: activeExecution.warpWriterId,
              capabilityProfile: activeExecution.capabilityProfile,
              repoState: activeExecution.repoState.getState(),
              sessionSnapshot: activeExecution.session.snapshot(),
              metricsSnapshot: activeExecution.metrics.snapshot(),
              ...(cacheSnapshots !== undefined ? { cacheSnapshots } : {}),
            });
            for (const update of workerResult.cacheUpdates) {
              activeExecution.cache.applySnapshot(update.path, update.observation);
            }
            activeExecution.metrics.applyDelta(workerResult.metricsDelta);
            activeExecution.metrics.recordToolResult(name as ToolDefinition["name"], workerResult.textBytes);
            activeExecution.session.recordBytesConsumed(workerResult.textBytes);
            invocation.response = {
              receipt: workerResult.receipt,
              tripwireSignals: workerResult.tripwireSignals,
            };
            return workerResult.result;
          }
          return executeHandler();
        })
        : await executeHandler();

      if (observability.enabled && invocation.response !== undefined) {
        await emitRuntimeEvent({
          event: "tool_call_completed",
          sessionId,
          traceId,
          seq: invocation.response.receipt.seq,
          tool: name,
          latencyMs: invocation.response.receipt.latencyMs,
          projection: invocation.response.receipt.projection,
          reason: invocation.response.receipt.reason,
          burdenKind: invocation.response.receipt.burden.kind,
          nonReadBurden: invocation.response.receipt.burden.nonRead,
          returnedBytes: invocation.response.receipt.returnedBytes,
          fileBytes: invocation.response.receipt.fileBytes,
          sessionDepth: execution?.session.getSessionDepth() ?? workspaceRouter.session.getSessionDepth(),
          tripwireSignals: invocation.response.tripwireSignals,
          metrics: invocation.response.receipt.cumulative,
        });
      }

      if (workspaceRouter.isBound() && attributedReadTools.has(name)) {
        const payload = parseToolPayload(result);
        if (payload !== null) {
          await workspaceRouter.noteReadObservation(
            name as "safe_read" | "file_outline" | "read_range",
            parsed,
            payload,
            execution,
          );
        }
      }

      return result;
    } catch (error) {
      if (observability.enabled) {
        const failure = classifyRuntimeFailure(error);
        await emitRuntimeEvent({
          event: "tool_call_failed",
          sessionId,
          traceId,
          tool: name,
          latencyMs: Date.now() - startedAtMs,
          sessionDepth: execution?.session.getSessionDepth() ?? workspaceRouter.session.getSessionDepth(),
          argKeys,
          errorKind: failure.kind,
          errorName: failure.name,
        });
      }
      throw error;
    }
  }

  function wrapWithPolicyCheck(toolName: ToolDefinition["name"], inner: ToolHandler): ToolHandler {
    return async (args: Record<string, unknown>) => {
      const rawPath = args["path"] as string | undefined;
      if (rawPath === undefined) return inner(args);
      const filePath = ctx.resolvePath(rawPath);
      let content: string;
      try {
        content = await ctx.fs.readFile(filePath, "utf-8");
      } catch {
        // File unreadable — let the inner handler deal with the error
        return inner(args);
      }
      const actual = { lines: content.split("\n").length, bytes: Buffer.byteLength(content) };
      const policy = evaluateMcpPolicy(ctx, filePath, actual);
      if (policy instanceof RefusedResult) {
        ctx.metrics.recordRefusal();
        return respond(toolName, {
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

  const activeToolRegistry = mode === "daemon" ? ALL_TOOL_REGISTRY : TOOL_REGISTRY;

  for (const def of activeToolRegistry) {
    const rawHandler = def.createHandler(ctx);
    const handler = def.policyCheck === true ? wrapWithPolicyCheck(def.name, rawHandler) : rawHandler;
    handlers.set(def.name, handler);

    if (def.schema !== undefined) {
      const zodSchema = z.object(def.schema).strict();
      schemas.set(def.name, zodSchema);
      mcpServer.registerTool(def.name, { description: def.description, inputSchema: def.schema }, async (args) => {
        return invokeTool(def.name, handler, args, zodSchema);
      });
    } else {
      mcpServer.registerTool(def.name, { description: def.description }, async () => {
        return invokeTool(def.name, handler, {});
      });
    }
  }

  if (observability.enabled) {
    void emitRuntimeEvent({
      event: "session_started",
      sessionId,
      logPath: observability.logPath,
      logPolicy: observability.logPolicy,
    });
  }

  return {
    getRegisteredTools(): string[] {
      return [...handlers.keys()];
    },
    async callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult> {
      const handler = handlers.get(name);
      if (handler === undefined) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const schema = schemas.get(name);
      return invokeTool(name, handler, args, schema);
    },
    injectSessionMessages(count: number): void {
      for (let i = 0; i < count; i++) {
        workspaceRouter.session.recordMessage();
      }
    },
    getWorkspaceStatus() {
      return workspaceRouter.getStatus();
    },
    getMcpServer(): McpServer {
      return mcpServer;
    },
  };
}
