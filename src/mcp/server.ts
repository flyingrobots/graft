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
import type { GitClient } from "../ports/git.js";
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
  git?: GitClient;
  persistedLocalHistoryGraph?: boolean;
}

interface ResolvedGraftServerConfig {
  readonly sessionId: string;
  readonly mode: WorkspaceMode;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly projectRoot: string | undefined;
  readonly graftDir: string;
  readonly sessionWarpWriterId: string | undefined;
}

interface DaemonRuntimeParts {
  readonly scheduler: DaemonJobScheduler | null;
  readonly workerPool: DaemonWorkerPool | null;
  readonly controlPlane: DaemonControlPlane | null;
  readonly monitorRuntime: PersistentMonitorRuntime | null;
  readonly repoOverview: DaemonRepoOverview | null;
  readonly runtime: () => DaemonRuntimeDescriptor;
}

interface RegisteredToolSurface {
  readonly handlers: Map<string, ToolHandler>;
  readonly schemas: Map<string, z.ZodObject>;
}

function setupMcpServer(): McpServer {
  return new McpServer({ name: "graft", version: GRAFT_VERSION });
}

function resolveGraftServerConfig(
  options: CreateGraftServerOptions,
): ResolvedGraftServerConfig {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const mode = options.mode ?? "repo_local";
  const sessionWarpWriterId = mode === "daemon"
    ? buildSessionWarpWriterId(sessionId)
    : undefined;
  const env = options.env ?? process.env;
  const projectRoot = mode === "repo_local"
    ? (options.projectRoot ?? env["GRAFT_PROJECT_ROOT"]?.trim() ?? process.cwd())
    : options.projectRoot;
  const graftDir = options.graftDir
    ?? (mode === "repo_local" && projectRoot !== undefined
      ? path.join(projectRoot, ".graft")
      : undefined);
  if (graftDir === undefined) {
    throw new Error("daemon mode requires an explicit graftDir");
  }

  return {
    sessionId,
    mode,
    env,
    projectRoot,
    graftDir,
    sessionWarpWriterId,
  };
}

function createDaemonRuntimeParts(input: {
  readonly config: ResolvedGraftServerConfig;
  readonly options: CreateGraftServerOptions;
  readonly codec: CanonicalJsonCodec;
  readonly gitClient: GitClient;
  readonly warpPool: WarpPool;
}): DaemonRuntimeParts {
  const { config, options, codec, gitClient, warpPool } = input;
  const scheduler = config.mode === "daemon"
    ? (options.daemonScheduler ?? new DaemonJobScheduler())
    : null;
  const workerPool = config.mode === "daemon"
    ? (options.daemonWorkerPool ?? new InlineDaemonWorkerPool())
    : null;
  const controlPlane = config.mode === "daemon"
    ? (options.daemonControlPlane ?? new DaemonControlPlane({
      fs: nodeFs,
      codec,
      git: gitClient,
      graftDir: config.graftDir,
    }))
    : null;
  const monitorRuntime = config.mode !== "daemon" || controlPlane === null || scheduler === null || workerPool === null
    ? null
    : (options.monitorRuntime ?? new PersistentMonitorRuntime({
      fs: nodeFs,
      codec,
      git: gitClient,
      graftDir: config.graftDir,
      controlPlane,
      scheduler,
      workerPool,
    }));
  const repoOverview = controlPlane !== null && monitorRuntime !== null
    ? new DaemonRepoOverview({ controlPlane, monitorRuntime })
    : null;
  const daemonStartedAt = new Date().toISOString();
  const runtime = options.daemonRuntime ?? (() => {
    return {
      transport: "unix_socket",
      sameUserOnly: true,
      socketPath: config.graftDir,
      mcpPath: "/mcp",
      healthPath: "/healthz",
      activeWarpRepos: warpPool.size(),
      startedAt: daemonStartedAt,
    };
  });

  return {
    scheduler,
    workerPool,
    controlPlane,
    monitorRuntime,
    repoOverview,
    runtime,
  };
}

function initWorkspaceRouter(input: {
  readonly config: ResolvedGraftServerConfig;
  readonly options: CreateGraftServerOptions;
  readonly gitClient: GitClient;
  readonly warpPool: WarpPool;
  readonly persistedLocalHistory: PersistedLocalHistoryStore;
  readonly daemon: DaemonRuntimeParts;
}): WorkspaceRouter {
  const {
    config,
    options,
    gitClient,
    warpPool,
    persistedLocalHistory,
    daemon,
  } = input;
  return new WorkspaceRouter({
    mode: config.mode,
    fs: nodeFs,
    git: gitClient,
    graftDir: config.graftDir,
    ...(config.projectRoot !== undefined ? { projectRoot: config.projectRoot } : {}),
    warpPool,
    transportSessionId: config.sessionId,
    ...(config.sessionWarpWriterId !== undefined ? { warpWriterId: config.sessionWarpWriterId } : {}),
    ...(daemon.controlPlane !== null ? { authorizationPolicy: daemon.controlPlane } : {}),
    ...(daemon.controlPlane !== null ? { sharedAttachPolicy: daemon.controlPlane } : {}),
    persistedLocalHistory,
    persistedLocalHistoryGraph: options.persistedLocalHistoryGraph ?? true,
  });
}

function createRuntimeReady(input: {
  readonly config: ResolvedGraftServerConfig;
  readonly workspaceRouter: WorkspaceRouter;
  readonly daemon: DaemonRuntimeParts;
}): Promise<void> {
  const { config, workspaceRouter, daemon } = input;
  return (async () => {
    if (config.mode === "repo_local" && config.projectRoot !== undefined) {
      await ensureGraftDirExcluded(config.projectRoot, config.graftDir, nodeFs);
    }
    await workspaceRouter.initialize();
    await Promise.all([
      daemon.controlPlane?.initialize() ?? Promise.resolve(),
      daemon.monitorRuntime?.initialize() ?? Promise.resolve(),
    ]);
  })().then(() => undefined);
}

function registerGraftToolSurface(input: {
  readonly mcpServer: McpServer;
  readonly mode: WorkspaceMode;
  readonly engine: ReturnType<typeof createInvocationEngine>;
  readonly ctx: ToolContext;
}): RegisteredToolSurface {
  const handlers = new Map<string, ToolHandler>();
  const schemas = new Map<string, z.ZodObject>();
  const activeToolRegistry = input.mode === "daemon" ? ALL_TOOL_REGISTRY : TOOL_REGISTRY;

  for (const def of activeToolRegistry) {
    const rawHandler = def.createHandler();
    const handler = def.policyCheck === true ? wrapWithPolicyCheck(def.name, rawHandler) : rawHandler;
    handlers.set(def.name, handler);

    if (def.schema !== undefined) {
      const zodSchema = z.object(def.schema).strict();
      schemas.set(def.name, zodSchema);
      input.mcpServer.registerTool(
        def.name,
        { description: def.description, inputSchema: def.schema },
        async (args) => input.engine.invokeTool(def.name, handler, args, input.ctx, zodSchema),
      );
    } else {
      input.mcpServer.registerTool(
        def.name,
        { description: def.description },
        async () => input.engine.invokeTool(def.name, handler, {}, input.ctx),
      );
    }
  }

  return { handlers, schemas };
}

function createGraftServerSurface(input: {
  readonly mcpServer: McpServer;
  readonly workspaceRouter: WorkspaceRouter;
  readonly engine: ReturnType<typeof createInvocationEngine>;
  readonly ctx: ToolContext;
  readonly registered: RegisteredToolSurface;
}): GraftServer {
  return {
    getRegisteredTools(): string[] {
      return [...input.registered.handlers.keys()];
    },
    async callTool(name: string, args: JsonObject): Promise<McpToolResult> {
      const handler = input.registered.handlers.get(name);
      if (handler === undefined) {
        throw new Error(`Unknown tool: ${name}`);
      }
      const schema = input.registered.schemas.get(name);
      return input.engine.invokeTool(name, handler, args, input.ctx, schema);
    },
    injectSessionMessages(count: number): void {
      for (let i = 0; i < count; i++) {
        input.workspaceRouter.governor.recordMessage();
      }
    },
    getWorkspaceStatus() {
      return input.workspaceRouter.getStatus();
    },
    getRuntimeCausalContext() {
      if (input.workspaceRouter.getStatus().bindState !== "bound") {
        return null;
      }
      return input.workspaceRouter.captureExecutionContext().getCausalContext();
    },
    getMcpServer(): McpServer {
      return input.mcpServer;
    },
  };
}

export function createGraftServer(options: CreateGraftServerOptions = {}): GraftServer {
  const config = resolveGraftServerConfig(options);
  const mcpServer = setupMcpServer();
  const codec = new CanonicalJsonCodec();
  const runCapture = resolveRunCaptureConfig({
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(options.runCapture !== undefined ? { overrides: options.runCapture } : {}),
  });
  const observability = resolveRuntimeObservabilityState({
    graftDir: config.graftDir,
    ...(options.env !== undefined ? { env: options.env } : {}),
    ...(options.runtimeObservability !== undefined ? { overrides: options.runtimeObservability } : {}),
  });
  const gitClient = options.git ?? nodeGit;
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
    graftDir: config.graftDir,
  });
  const daemon = createDaemonRuntimeParts({
    config,
    options,
    codec,
    gitClient,
    warpPool,
  });
  const workspaceRouter = initWorkspaceRouter({
    config,
    options,
    gitClient,
    warpPool,
    persistedLocalHistory,
    daemon,
  });
  const runtimeReady = createRuntimeReady({ config, workspaceRouter, daemon });

  // --- Invocation engine: AsyncLocalStorage, respond(), invokeTool() ---

  const engine = createInvocationEngine({
    sessionId: config.sessionId,
    mode: config.mode,
    codec,
    observability,
    runtimeLogger,
    workspaceRouter,
    daemonScheduler: daemon.scheduler,
    daemonWorkerPool: daemon.workerPool,
    runtimeReady,
  });

  // --- ToolContext: lazy-getter facade over workspace router + execution context ---

  const ctx: ToolContext = buildToolContext({
    workspaceRouter,
    fs: nodeFs,
    codec,
    processRunner,
    git: gitClient,
    runCapture,
    observability,
    daemonControlPlane: daemon.controlPlane,
    daemonRepoOverview: daemon.repoOverview,
    daemonScheduler: daemon.scheduler,
    daemonWorkerPool: daemon.workerPool,
    monitorRuntime: daemon.monitorRuntime,
    daemonRuntime: daemon.runtime,
    getActiveExecutionContext: engine.getActiveExecutionContext,
    respond: engine.respond,
    recordFootprint: (entry) => { recordFootprint(engine.invocationStorage, entry); },
  });

  // --- Tool registration ---

  const registered = registerGraftToolSurface({
    mcpServer,
    mode: config.mode,
    engine,
    ctx,
  });

  if (observability.enabled) {
    void engine.emitRuntimeEvent({
      event: "session_started",
      sessionId: config.sessionId,
      logPath: observability.logPath,
      logPolicy: observability.logPolicy,
    });
  }

  return createGraftServerSurface({
    mcpServer,
    workspaceRouter,
    engine,
    ctx,
    registered,
  });
}
