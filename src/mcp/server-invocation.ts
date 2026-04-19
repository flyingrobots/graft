import { AsyncLocalStorage } from "node:async_hooks";
import * as crypto from "node:crypto";
import { z } from "zod";
import type { JsonObject } from "../contracts/json-object.js";
import type { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { buildReceiptResult } from "./receipt.js";
import type { ToolHandler, ToolDefinition, ToolContext } from "./context.js";
import type { McpToolResult, McpToolReceipt } from "./receipt.js";
import type {
  WorkspaceRouter,
  WorkspaceExecutionContext,
  WorkspaceMode,
} from "./workspace-router.js";
import type { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import type { DaemonWorkerPool } from "./daemon-worker-pool.js";
import type {
  RuntimeEventLogger,
  RuntimeObservabilityState,
  ToolCallFootprint,
  ToolCallFootprintRegion,
} from "./runtime-observability.js";
import {
  classifyRuntimeFailure,
  sanitizeArgKeys,
} from "./runtime-observability.js";
import {
  attributedReadTools,
  daemonScheduledRepoTools,
  enforceDaemonToolAccess,
  parseToolPayload,
  repoStateOptionalTools,
  resolveDaemonOffloadedRepoTool,
} from "./server-tool-access.js";

/** Mutable footprint accumulator for the current tool invocation. */
export interface FootprintAccumulator {
  readonly paths: Set<string>;
  readonly symbols: Set<string>;
  readonly regions: ToolCallFootprintRegion[];
}

/** Mutable invocation state tracked via AsyncLocalStorage. */
export interface InvocationStore {
  readonly traceId: string;
  readonly startedAtMs: number;
  readonly footprint: FootprintAccumulator;
  response?: { readonly receipt: McpToolReceipt; readonly tripwireSignals: readonly string[] };
}

/** Dependencies injected by the composition root to build the invocation engine. */
export interface InvocationEngineDeps {
  readonly sessionId: string;
  readonly mode: WorkspaceMode;
  readonly codec: CanonicalJsonCodec;
  readonly observability: RuntimeObservabilityState;
  readonly runtimeLogger: RuntimeEventLogger;
  readonly workspaceRouter: WorkspaceRouter;
  readonly daemonScheduler: DaemonJobScheduler | null;
  readonly daemonWorkerPool: DaemonWorkerPool | null;
  readonly runtimeReady: Promise<void>;
}

/** Engine returned by createInvocationEngine. */
export interface InvocationEngine {
  /** The AsyncLocalStorage for execution contexts — needed by the ToolContext builder. */
  readonly executionContextStorage: AsyncLocalStorage<WorkspaceExecutionContext>;
  /** The AsyncLocalStorage for invocation tracking — needed by respond(). */
  readonly invocationStorage: AsyncLocalStorage<InvocationStore>;
  /** Monotonically increasing sequence counter (mutable). */
  getSeq(): number;
  incrementSeq(): number;
  /** Build the respond() function suitable for ToolContext. */
  respond: (tool: ToolDefinition["name"], data: JsonObject) => McpToolResult;
  /** Get the active execution context from AsyncLocalStorage. */
  getActiveExecutionContext: () => WorkspaceExecutionContext | null;
  /** Invoke a tool with full lifecycle (observability, scheduling, repo state). */
  invokeTool: (
    name: string,
    handler: ToolHandler,
    args: JsonObject,
    ctx: ToolContext,
    schema?: z.ZodObject,
  ) => Promise<McpToolResult>;
  /** Emit a runtime observability event. */
  emitRuntimeEvent: (event: Parameters<RuntimeEventLogger["log"]>[0]) => Promise<void>;
}

/**
 * Snapshot a footprint accumulator into an immutable ToolCallFootprint.
 * Returns undefined if nothing was recorded — avoids empty objects in logs.
 */
function snapshotFootprint(acc: FootprintAccumulator): ToolCallFootprint | undefined {
  if (acc.paths.size === 0 && acc.symbols.size === 0 && acc.regions.length === 0) {
    return undefined;
  }
  return {
    paths: [...acc.paths].sort(),
    symbols: [...acc.symbols].sort(),
    regions: [...acc.regions],
  };
}

/**
 * Record path/symbol/region observations into the current invocation's footprint.
 * Safe to call outside an invocation context (silently no-ops).
 */
export function recordFootprint(
  invocationStorage: AsyncLocalStorage<InvocationStore>,
  entry: {
    readonly paths?: readonly string[];
    readonly symbols?: readonly string[];
    readonly regions?: readonly ToolCallFootprintRegion[];
  },
): void {
  const store = invocationStorage.getStore();
  if (store === undefined) return;
  if (entry.paths !== undefined) {
    for (const p of entry.paths) store.footprint.paths.add(p);
  }
  if (entry.symbols !== undefined) {
    for (const s of entry.symbols) store.footprint.symbols.add(s);
  }
  if (entry.regions !== undefined) {
    for (const r of entry.regions) store.footprint.regions.push(r);
  }
}

/**
 * Creates the invocation engine that manages tool execution lifecycle:
 * - AsyncLocalStorage for execution context and invocation tracking
 * - Receipt building via respond()
 * - Tool invocation with observability, daemon scheduling, and worker offloading
 */
export function createInvocationEngine(deps: InvocationEngineDeps): InvocationEngine {
  const {
    sessionId,
    mode,
    codec,
    observability,
    runtimeLogger,
    workspaceRouter,
    daemonScheduler,
    daemonWorkerPool,
    runtimeReady,
  } = deps;

  const executionContextStorage = new AsyncLocalStorage<WorkspaceExecutionContext>();
  const invocationStorage = new AsyncLocalStorage<InvocationStore>();
  let seq = 0;

  function getActiveExecutionContext(): WorkspaceExecutionContext | null {
    return executionContextStorage.getStore() ?? null;
  }

  async function emitRuntimeEvent(event: Parameters<RuntimeEventLogger["log"]>[0]): Promise<void> {
    try {
      await runtimeReady;
      await runtimeLogger.log(event);
    } catch {
      // Observability must never become the reason a tool call fails.
    }
  }

  function respond(tool: ToolDefinition["name"], data: JsonObject): McpToolResult {
    const invocation = invocationStorage.getStore();
    if (invocation === undefined) {
      throw new Error("MCP respond() called outside an active invocation");
    }
    seq++;
    const execution = getActiveExecutionContext();
    const governor = execution?.governor ?? workspaceRouter.governor;
    const metrics = execution?.metrics ?? workspaceRouter.metrics;
    const tripwires = governor.checkTripwires();
    const { result, textBytes, receipt } = buildReceiptResult(tool, data, {
      sessionId,
      traceId: invocation.traceId,
      seq,
      latencyMs: Date.now() - invocation.startedAtMs,
      codec,
      metrics: metrics.snapshot(),
      tripwires,
      budget: governor.getBudget(),
    });
    invocation.response = {
      receipt,
      tripwireSignals: tripwires.map((wire) => wire.signal),
    };
    metrics.recordToolResult(tool, textBytes);
    governor.recordBytesConsumed(textBytes);
    return result;
  }

  async function invokeTool(
    name: string,
    handler: ToolHandler,
    args: JsonObject,
    ctx: ToolContext,
    schema?: z.ZodObject,
  ): Promise<McpToolResult> {
    await runtimeReady;
    workspaceRouter.governor.recordMessage();
    workspaceRouter.governor.recordToolCall(name);
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
        sessionDepth: workspaceRouter.governor.getGovernorDepth(),
      });
    }

    const invocation: InvocationStore = {
      traceId,
      startedAtMs,
      footprint: { paths: new Set(), symbols: new Set(), regions: [] },
    };
    let execution: WorkspaceExecutionContext | null = null;

    try {
      const parsed: JsonObject = schema !== undefined ? schema.parse(args) : args;
      enforceDaemonToolAccess({
        mode,
        name,
        isBound: workspaceRouter.isBound(),
        status: workspaceRouter.getStatus(),
      });

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
              return handler(parsed, ctx);
            });
          }
          if (workspaceRouter.isBound() && !repoStateOptionalTools.has(name)) {
            await workspaceRouter.observeRepoState();
          }
          return handler(parsed, ctx);
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
              governorSnapshot: activeExecution.governor.snapshot(),
              metricsSnapshot: activeExecution.metrics.snapshot(),
              ...(cacheSnapshots !== undefined ? { cacheSnapshots } : {}),
            });
            for (const update of workerResult.cacheUpdates) {
              activeExecution.cache.applySnapshot(update.path, update.observation);
            }
            activeExecution.metrics.applyDelta(workerResult.metricsDelta);
            activeExecution.metrics.recordToolResult(name as ToolDefinition["name"], workerResult.textBytes);
            activeExecution.governor.recordBytesConsumed(workerResult.textBytes);
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
        const footprint = snapshotFootprint(invocation.footprint);
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
          sessionDepth: execution?.governor.getGovernorDepth() ?? workspaceRouter.governor.getGovernorDepth(),
          tripwireSignals: invocation.response.tripwireSignals,
          metrics: invocation.response.receipt.cumulative,
          ...(footprint !== undefined ? { footprint } : {}),
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
          sessionDepth: execution?.governor.getGovernorDepth() ?? workspaceRouter.governor.getGovernorDepth(),
          argKeys,
          errorKind: failure.kind,
          errorName: failure.name,
        });
      }
      throw error;
    }
  }

  return {
    executionContextStorage,
    invocationStorage,
    getSeq: () => seq,
    incrementSeq: () => ++seq,
    respond,
    getActiveExecutionContext,
    invokeTool,
    emitRuntimeEvent,
  };
}
