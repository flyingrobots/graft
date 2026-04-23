import type { JsonObject } from "../contracts/json-object.js";
import type { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import type { FileSystem } from "../ports/filesystem.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import type { GitClient } from "../ports/git.js";
import type { WarpContext } from "../warp/context.js";
import type { ToolContext, ToolDefinition } from "./context.js";
import type { McpToolResult } from "./receipt.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import type { RuntimeObservabilityState, ToolCallFootprintRegion } from "./runtime-observability.js";
import type {
  WorkspaceRouter,
  WorkspaceExecutionContext,
} from "./workspace-router.js";
import type { DaemonControlPlane } from "./daemon-control-plane.js";
import type { DaemonRepoOverview } from "./daemon-repos.js";
import type { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import type { DaemonWorkerPool } from "./daemon-worker-pool.js";
import type { PersistentMonitorRuntime } from "./persistent-monitor-runtime.js";
import type { DaemonRuntimeDescriptor } from "./daemon-control-plane.js";
import { mergeRepoConcurrencySummaryWithLiveSessions } from "./repo-concurrency.js";

/** Dependencies injected by the composition root to build a ToolContext. */
export interface ToolContextDeps {
  readonly workspaceRouter: WorkspaceRouter;
  readonly fs: FileSystem;
  readonly codec: CanonicalJsonCodec;
  readonly processRunner: ProcessRunner;
  readonly git: GitClient;
  readonly runCapture: RunCaptureConfig;
  readonly observability: RuntimeObservabilityState;
  readonly daemonControlPlane: DaemonControlPlane | null;
  readonly daemonRepoOverview: DaemonRepoOverview | null;
  readonly daemonScheduler: DaemonJobScheduler | null;
  readonly daemonWorkerPool: DaemonWorkerPool | null;
  readonly monitorRuntime: PersistentMonitorRuntime | null;
  readonly daemonRuntime: () => DaemonRuntimeDescriptor;
  readonly getActiveExecutionContext: () => WorkspaceExecutionContext | null;
  readonly respond: (tool: ToolDefinition["name"], data: JsonObject) => McpToolResult;
  readonly recordFootprint: (entry: {
    readonly paths?: readonly string[];
    readonly symbols?: readonly string[];
    readonly regions?: readonly ToolCallFootprintRegion[];
  }) => void;
}

/**
 * Builds the ToolContext object with lazy property getters that delegate
 * to the active WorkspaceExecutionContext (when inside a daemon-scheduled
 * tool call) or fall back to the WorkspaceRouter defaults.
 */
export function buildToolContext(deps: ToolContextDeps): ToolContext {
  const {
    workspaceRouter,
    daemonControlPlane,
    daemonRepoOverview,
    daemonScheduler,
    daemonWorkerPool,
    monitorRuntime,
    daemonRuntime,
    getActiveExecutionContext,
    respond,
  } = deps;

  return {
    get projectRoot(): string {
      return getActiveExecutionContext()?.projectRoot ?? workspaceRouter.getProjectRoot();
    },
    get graftDir(): string {
      return getActiveExecutionContext()?.graftDir ?? workspaceRouter.graftDir;
    },
    get graftignorePatterns(): readonly string[] {
      return getActiveExecutionContext()?.graftignorePatterns ?? workspaceRouter.getGraftignorePatterns();
    },
    get governor() {
      return getActiveExecutionContext()?.governor ?? workspaceRouter.governor;
    },
    get cache() {
      return getActiveExecutionContext()?.cache ?? workspaceRouter.cache;
    },
    get metrics() {
      return getActiveExecutionContext()?.metrics ?? workspaceRouter.metrics;
    },
    respond,
    recordFootprint: deps.recordFootprint,
    resolvePath(relative: string): string {
      return getActiveExecutionContext()?.resolvePath(relative) ?? workspaceRouter.getPathResolver()(relative);
    },
    fs: deps.fs,
    codec: deps.codec,
    process: deps.processRunner,
    git: deps.git,
    runCapture: deps.runCapture,
    observability: deps.observability,
    getWarp(): Promise<WarpContext> {
      return getActiveExecutionContext()?.getWarp() ?? workspaceRouter.getWarp();
    },
    getRepoState() {
      return getActiveExecutionContext()?.repoState.getState() ?? workspaceRouter.getRepoState();
    },
    getCausalContext() {
      return getActiveExecutionContext()?.getCausalContext() ?? workspaceRouter.captureExecutionContext().getCausalContext();
    },
    getWorkspaceOverlayFooting() {
      return workspaceRouter.getWorkspaceOverlayFooting();
    },
    getPersistedLocalHistorySummary() {
      return workspaceRouter.getPersistedLocalHistorySummary();
    },
    getPersistedLocalActivityWindow(limit) {
      return workspaceRouter.getPersistedLocalActivityWindow(limit);
    },
    getRepoConcurrencySummary() {
      return (async () => {
        const summary = await workspaceRouter.getRepoConcurrencySummary();
        if (summary === null || daemonControlPlane === null) {
          return summary;
        }
        const status = workspaceRouter.getStatus();
        if (status.bindState !== "bound" || status.repoId === null || status.worktreeId === null) {
          return summary;
        }
        const causalContext = workspaceRouter.captureExecutionContext().getCausalContext();
        return mergeRepoConcurrencySummaryWithLiveSessions({
          currentSummary: summary,
          currentRepoId: status.repoId,
          currentWorktreeId: status.worktreeId,
          currentCheckoutEpochId: causalContext.checkoutEpochId,
          sessions: daemonControlPlane.listTransports(),
        });
      })();
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
      return Promise.resolve(daemonControlPlane.listTransports());
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
    nudgeMonitor(request) {
      if (monitorRuntime === null) {
        return Promise.resolve({ ok: false, errorCode: "no_daemon", error: "Monitor runtime is not available." } as MonitorActionResult);
      }
      return monitorRuntime.nudgeMonitor(request);
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
}
