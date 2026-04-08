import { AsyncLocalStorage } from "node:async_hooks";
import * as crypto from "node:crypto";
import * as path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SessionTracker } from "../session/tracker.js";
import { Metrics } from "./metrics.js";
import { ObservationCache } from "./cache.js";
import { buildReceiptResult } from "./receipt.js";
import type { ToolHandler, ToolContext, ToolDefinition } from "./context.js";
import { createPathResolver } from "./context.js";
import type { McpToolResult } from "./receipt.js";
import { evaluateMcpPolicy, loadProjectGraftignore } from "./policy.js";
import { nodeFs } from "../adapters/node-fs.js";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { RefusedResult } from "../policy/types.js";
import type WarpApp from "@git-stunts/git-warp";
import { openWarp } from "../warp/open.js";
import { RepoStateTracker } from "./repo-state.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import { resolveRunCaptureConfig } from "./run-capture-config.js";
import {
  RuntimeEventLogger,
  classifyRuntimeFailure,
  ensureGraftDirExcluded,
  resolveRuntimeObservabilityState,
  sanitizeArgKeys,
  type RuntimeObservabilityState,
} from "./runtime-observability.js";

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
  statsTool,
  explainTool,
  setBudgetTool,
  sinceTool,
  mapTool,
  codeShowTool,
  codeFindTool,
  codeRefsTool,
];

export interface GraftServer {
  getRegisteredTools(): string[];
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  injectSessionMessages(count: number): void;
  getMcpServer(): McpServer;
}

export interface CreateGraftServerOptions {
  projectRoot?: string;
  graftDir?: string;
  env?: Readonly<Record<string, string | undefined>>;
  runCapture?: Partial<RunCaptureConfig>;
  runtimeObservability?: Partial<RuntimeObservabilityState>;
}

export function createGraftServer(options: CreateGraftServerOptions = {}): GraftServer {
  const mcpServer = new McpServer({ name: "graft", version: "0.0.0" });
  const session = new SessionTracker();
  const sessionId = crypto.randomUUID();
  const projectRoot = options.projectRoot ?? process.cwd();
  const graftDir = options.graftDir ?? path.join(projectRoot, ".graft");
  const graftignorePatterns = loadProjectGraftignore(nodeFs, projectRoot);
  const metrics = new Metrics();
  const cache = new ObservationCache();
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
  const runtimeReady = ensureGraftDirExcluded(projectRoot, graftDir, nodeFs);
  const handlers = new Map<string, ToolHandler>();
  const schemas = new Map<string, z.ZodObject>();
  const repoState = new RepoStateTracker(projectRoot);
  const invocationStorage = new AsyncLocalStorage<{
    readonly traceId: string;
    readonly startedAtMs: number;
    response?: { readonly receipt: import("./receipt.js").McpToolReceipt; readonly tripwireSignals: readonly string[] };
  }>();
  let seq = 0;

  async function emitRuntimeEvent(
    event: Parameters<RuntimeEventLogger["log"]>[0],
  ): Promise<void> {
    try {
      await runtimeReady;
      await runtimeLogger.log(event);
    } catch {
      // Observability must never become the reason a tool call fails.
    }
  }

  function respond(tool: ToolDefinition["name"], data: Record<string, unknown>): McpToolResult {
    const invocation = invocationStorage.getStore();
    if (invocation === undefined) {
      throw new Error("MCP respond() called outside an active invocation");
    }
    seq++;
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
    metrics.addBytesReturned(textBytes);
    session.recordBytesConsumed(textBytes);
    return result;
  }

  // Lazy WARP initialization — only loaded when a WARP-backed tool needs it.
  // Single pending promise prevents duplicate instances from concurrent calls.
  // On rejection, clear cache so subsequent calls can retry.
  let warpPromise: Promise<WarpApp> | null = null;
  function getWarp(): Promise<WarpApp> {
    warpPromise ??= openWarp({ cwd: projectRoot }).catch((err: unknown) => {
      warpPromise = null;
      throw err;
    });
    return warpPromise;
  }

  const ctx: ToolContext = {
    projectRoot,
    graftDir,
    graftignorePatterns,
    session,
    cache,
    metrics,
    respond,
    resolvePath: createPathResolver(projectRoot),
    fs: nodeFs,
    codec,
    runCapture,
    observability,
    getWarp,
    getRepoState: () => repoState.getState(),
  };

  async function invokeTool(
    name: string,
    handler: ToolHandler,
    args: Record<string, unknown>,
    schema?: z.ZodObject,
  ): Promise<McpToolResult> {
    await runtimeReady;
    session.recordMessage();
    session.recordToolCall(name);
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
        sessionDepth: session.getSessionDepth(),
      });
    }

    const invocation = { traceId, startedAtMs } as {
      readonly traceId: string;
      readonly startedAtMs: number;
      response?: { readonly receipt: import("./receipt.js").McpToolReceipt; readonly tripwireSignals: readonly string[] };
    };

    try {
      const result = await invocationStorage.run(invocation, async () => {
        const parsed: Record<string, unknown> = schema !== undefined ? schema.parse(args) : args;
        repoState.observe();
        return handler(parsed);
      });

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
          returnedBytes: invocation.response.receipt.returnedBytes,
          fileBytes: invocation.response.receipt.fileBytes,
          sessionDepth: session.getSessionDepth(),
          tripwireSignals: invocation.response.tripwireSignals,
          metrics: invocation.response.receipt.cumulative,
        });
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
          sessionDepth: session.getSessionDepth(),
          argKeys,
          errorKind: failure.kind,
          errorName: failure.name,
        });
      }
      throw error;
    }
  }

  function wrapWithPolicyCheck(toolName: string, inner: ToolHandler): ToolHandler {
    return (args: Record<string, unknown>) => {
      const rawPath = args["path"] as string | undefined;
      if (rawPath === undefined) return inner(args);
      const filePath = ctx.resolvePath(rawPath);
      let content: string;
      try {
        content = ctx.fs.readFileSync(filePath, "utf-8");
      } catch {
        // File unreadable — let the inner handler deal with the error
        return inner(args);
      }
      const actual = { lines: content.split("\n").length, bytes: Buffer.byteLength(content) };
      const policy = evaluateMcpPolicy(ctx, filePath, actual);
      if (policy instanceof RefusedResult) {
        metrics.recordRefusal();
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

  for (const def of TOOL_REGISTRY) {
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
        session.recordMessage();
      }
    },
    getMcpServer(): McpServer {
      return mcpServer;
    },
  };
}
