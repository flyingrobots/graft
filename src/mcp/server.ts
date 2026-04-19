import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { JsonObject } from "../contracts/json-object.js";
import type { ToolHandler, ToolContext } from "./context.js";
import type { McpToolResult } from "./receipt.js";
import { nodeFs } from "../adapters/node-fs.js";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeProcessRunner } from "../adapters/node-process-runner.js";
import type { ProcessRunner } from "../ports/process-runner.js";
import { nodeGit } from "../adapters/node-git.js";
import { openWarp } from "../warp/open.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import { resolveRunCaptureConfig } from "./run-capture-config.js";
import {
  WorkspaceRouter,
  type WorkspaceMode,
} from "./workspace-router.js";
import { DaemonControlPlane, type DaemonRuntimeDescriptor } from "./daemon-control-plane.js";
import { DaemonRepoOverview } from "./daemon-repos.js";
import { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import { InlineDaemonWorkerPool, type DaemonWorkerPool } from "./daemon-worker-pool.js";
import { PersistentMonitorRuntime } from "./persistent-monitor-runtime.js";
import {
  RuntimeEventLogger,
  ensureGraftDirExcluded,
  resolveRuntimeObservabilityState,
  type RuntimeObservabilityState,
} from "./runtime-observability.js";
import { InMemoryWarpPool, type WarpPool } from "./warp-pool.js";
import { buildSessionWarpWriterId } from "../warp/writer-id.js";
import { PersistedLocalHistoryStore } from "./persisted-local-history.js";
import { GRAFT_VERSION } from "../version.js";
import { ALL_TOOL_REGISTRY, TOOL_REGISTRY } from "./tool-registry.js";
import { wrapWithPolicyCheck } from "./server-tool-access.js";
import { buildToolContext } from "./server-context.js";
import { createInvocationEngine, recordFootprint } from "./server-invocation.js";

export type { McpToolResult, ToolHandler, ToolContext };
export { ALL_TOOL_REGISTRY, TOOL_REGISTRY } from "./tool-registry.js";

export interface GraftServer {
  getRegisteredTools(): string[];
  callTool(name: string, args: JsonObject): Promise<McpToolResult>;
  injectSessionMessages(count: number): void;
  getWorkspaceStatus(): import("./workspace-router.js").WorkspaceStatus;
  getRuntimeCausalContext(): import("./runtime-causal-context.js").RuntimeCausalContext | null;
  getMcpServer(): McpServer;
}

export interface CreateGraftServerOptions {
  mode?: WorkspaceMode;
  sessionId?: string;
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
  processRunner?: ProcessRunner;
}

export function createGraftServer(options: CreateGraftServerOptions = {}): GraftServer {
  const mcpServer = new McpServer({ name: "graft", version: GRAFT_VERSION });
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const mode = options.mode ?? "repo_local";
  const sessionWarpWriterId = mode === "daemon" ? buildSessionWarpWriterId(sessionId) : undefined;
  const env = options.env ?? process.env;
  const projectRoot = mode === "repo_local" ? (options.projectRoot ?? env["GRAFT_PROJECT_ROOT"]?.trim() ?? process.cwd()) : options.projectRoot;
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
  const processRunner = options.processRunner ?? nodeProcessRunner;
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
    ...(daemonControlPlane !== null ? { sharedAttachPolicy: daemonControlPlane } : {}),
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

  // --- Invocation engine: AsyncLocalStorage, respond(), invokeTool() ---

  const engine = createInvocationEngine({
    sessionId,
    mode,
    codec,
    observability,
    runtimeLogger,
    workspaceRouter,
    daemonScheduler,
    daemonWorkerPool,
    runtimeReady,
  });

  // --- ToolContext: lazy-getter facade over workspace router + execution context ---

  const ctx: ToolContext = buildToolContext({
    workspaceRouter,
    fs: nodeFs,
    codec,
    processRunner,
    git: nodeGit,
    runCapture,
    observability,
    daemonControlPlane,
    daemonRepoOverview,
    daemonScheduler,
    daemonWorkerPool,
    monitorRuntime,
    daemonRuntime,
    getActiveExecutionContext: engine.getActiveExecutionContext,
    respond: engine.respond,
    recordFootprint: (entry) => { recordFootprint(engine.invocationStorage, entry); },
  });

  // --- Tool registration ---

  const activeToolRegistry = mode === "daemon" ? ALL_TOOL_REGISTRY : TOOL_REGISTRY;

  for (const def of activeToolRegistry) {
    const rawHandler = def.createHandler();
    const handler = def.policyCheck === true ? wrapWithPolicyCheck(def.name, rawHandler) : rawHandler;
    handlers.set(def.name, handler);

    if (def.schema !== undefined) {
      const zodSchema = z.object(def.schema).strict();
      schemas.set(def.name, zodSchema);
      mcpServer.registerTool(def.name, { description: def.description, inputSchema: def.schema }, async (args) => {
        return engine.invokeTool(def.name, handler, args, ctx, zodSchema);
      });
    } else {
      mcpServer.registerTool(def.name, { description: def.description }, async () => {
        return engine.invokeTool(def.name, handler, {}, ctx);
      });
    }
  }

  if (observability.enabled) {
    void engine.emitRuntimeEvent({
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
    async callTool(name: string, args: JsonObject): Promise<McpToolResult> {
      const handler = handlers.get(name);
      if (handler === undefined) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const schema = schemas.get(name);
      return engine.invokeTool(name, handler, args, ctx, schema);
    },
    injectSessionMessages(count: number): void {
      for (let i = 0; i < count; i++) {
        workspaceRouter.governor.recordMessage();
      }
    },
    getWorkspaceStatus() {
      return workspaceRouter.getStatus();
    },
    getRuntimeCausalContext() {
      if (workspaceRouter.getStatus().bindState !== "bound") {
        return null;
      }
      return workspaceRouter.captureExecutionContext().getCausalContext();
    },
    getMcpServer(): McpServer {
      return mcpServer;
    },
  };
}
