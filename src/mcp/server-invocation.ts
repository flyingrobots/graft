import { AsyncLocalStorage } from "node:async_hooks";
import * as crypto from "node:crypto";
import { z } from "zod";
import type { JsonObject } from "../contracts/json-object.js";
import type { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { buildReceiptResult } from "./receipt.js";
import type { ObservationSnapshot } from "./cache.js";
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
import { readReceiptMode, type ReceiptMode } from "./tool-input-controls.js";

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
  readonly receiptMode: ReceiptMode;
  readonly footprint: FootprintAccumulator;
  response?: { readonly receipt: McpToolReceipt; readonly tripwireSignals: readonly string[] };
}

interface InvocationEnvelope {
  readonly traceId: string;
  readonly startedAtMs: number;
  readonly argKeys: readonly string[];
  readonly receiptMode: ReceiptMode;
}

interface InvocationExecutionPlan {
  readonly execution: WorkspaceExecutionContext | null;
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
      receiptMode: invocation.receiptMode,
    });
    invocation.response = {
      receipt,
      tripwireSignals: tripwires.map((wire) => wire.signal),
    };
    metrics.recordToolResult(tool, textBytes);
    governor.recordBytesConsumed(textBytes);
    return result;
  }

  function openInvocation(args: JsonObject): InvocationEnvelope {
    return {
      traceId: crypto.randomUUID(),
      startedAtMs: Date.now(),
      argKeys: sanitizeArgKeys(args),
      receiptMode: readReceiptMode(args),
    };
  }

  function createInvocationStore(envelope: InvocationEnvelope): InvocationStore {
    return {
      traceId: envelope.traceId,
      startedAtMs: envelope.startedAtMs,
      receiptMode: envelope.receiptMode,
      footprint: { paths: new Set(), symbols: new Set(), regions: [] },
    };
  }

  async function emitInvocationStarted(
    name: string,
    envelope: InvocationEnvelope,
  ): Promise<void> {
    if (!observability.enabled) return;
    await emitRuntimeEvent({
      event: "tool_call_started",
      sessionId,
      traceId: envelope.traceId,
      tool: name,
      argKeys: envelope.argKeys,
      sessionDepth: workspaceRouter.governor.getGovernorDepth(),
    });
  }

  function decodeInvocationArgs(
    args: JsonObject,
    schema: z.ZodObject | undefined,
  ): JsonObject {
    return schema !== undefined ? schema.parse(args) : args;
  }

  function authorizeInvocation(name: string): void {
    enforceDaemonToolAccess({
      mode,
      name,
      isBound: workspaceRouter.isBound(),
      status: workspaceRouter.getStatus(),
    });
  }

  function planInvocationExecution(name: string): InvocationExecutionPlan {
    const execution = daemonScheduler !== null
      && workspaceRouter.isBound()
      && daemonScheduledRepoTools.has(name)
      ? workspaceRouter.captureExecutionContext()
      : null;
    return { execution };
  }

  async function executeHandlerInScope(input: {
    readonly name: string;
    readonly handler: ToolHandler;
    readonly parsed: JsonObject;
    readonly ctx: ToolContext;
    readonly invocation: InvocationStore;
    readonly execution: WorkspaceExecutionContext | null;
  }): Promise<McpToolResult> {
    return invocationStorage.run(input.invocation, async () => {
      if (input.execution !== null) {
        const activeExecution = input.execution;
        return executionContextStorage.run(activeExecution, async () => {
          if (!repoStateOptionalTools.has(input.name)) {
            await activeExecution.repoState.observe();
          }
          return input.handler(input.parsed, input.ctx);
        });
      }
      if (workspaceRouter.isBound() && !repoStateOptionalTools.has(input.name)) {
        await workspaceRouter.observeRepoState();
      }
      return input.handler(input.parsed, input.ctx);
    });
  }

  function snapshotWorkerCache(input: {
    readonly parsed: JsonObject;
    readonly execution: WorkspaceExecutionContext;
  }): Record<string, ObservationSnapshot> | undefined {
    if (typeof input.parsed["path"] !== "string") {
      return undefined;
    }
    const filePath = input.execution.resolvePath(input.parsed["path"]);
    const snapshot = input.execution.cache.snapshotEntry(filePath);
    return snapshot === null ? {} : { [filePath]: snapshot };
  }

  async function runOffloadedRepoTool(input: {
    readonly name: string;
    readonly parsed: JsonObject;
    readonly execution: WorkspaceExecutionContext;
    readonly envelope: InvocationEnvelope;
    readonly invocation: InvocationStore;
    readonly executeHandler: () => Promise<McpToolResult>;
  }): Promise<McpToolResult> {
    if (daemonWorkerPool === null) {
      return input.executeHandler();
    }

    await input.execution.repoState.observe();
    const offloadedTool = resolveDaemonOffloadedRepoTool(
      input.name,
      input.parsed,
      input.execution.repoState.getState().dirty,
    );
    if (offloadedTool === null) {
      return input.executeHandler();
    }

    const cacheSnapshots = snapshotWorkerCache({
      parsed: input.parsed,
      execution: input.execution,
    });
    const workerResult = await daemonWorkerPool.runRepoTool({
      sessionId,
      workspaceSliceId: input.execution.sliceId,
      traceId: input.envelope.traceId,
      seq: ++seq,
      startedAtMs: input.envelope.startedAtMs,
      tool: offloadedTool,
      args: input.parsed,
      projectRoot: input.execution.projectRoot,
      graftDir: input.execution.graftDir,
      graftignorePatterns: input.execution.graftignorePatterns,
      repoId: input.execution.repoId,
      worktreeId: input.execution.worktreeId,
      gitCommonDir: input.execution.gitCommonDir,
      writerId: input.execution.warpWriterId,
      capabilityProfile: input.execution.capabilityProfile,
      repoState: input.execution.repoState.getState(),
      governorSnapshot: input.execution.governor.snapshot(),
      metricsSnapshot: input.execution.metrics.snapshot(),
      receiptMode: input.envelope.receiptMode,
      ...(cacheSnapshots !== undefined ? { cacheSnapshots } : {}),
    });

    for (const update of workerResult.cacheUpdates) {
      input.execution.cache.applySnapshot(update.path, update.observation);
    }
    input.execution.metrics.applyDelta(workerResult.metricsDelta);
    input.execution.metrics.recordToolResult(
      input.name as ToolDefinition["name"],
      workerResult.textBytes,
    );
    input.execution.governor.recordBytesConsumed(workerResult.textBytes);
    input.invocation.response = {
      receipt: workerResult.receipt,
      tripwireSignals: workerResult.tripwireSignals,
    };
    return workerResult.result;
  }

  async function dispatchInvocation(input: {
    readonly name: string;
    readonly parsed: JsonObject;
    readonly handler: ToolHandler;
    readonly ctx: ToolContext;
    readonly invocation: InvocationStore;
    readonly execution: WorkspaceExecutionContext | null;
    readonly envelope: InvocationEnvelope;
  }): Promise<McpToolResult> {
    const executeHandler = async (): Promise<McpToolResult> => executeHandlerInScope(input);

    if (input.execution === null || daemonScheduler === null) {
      return executeHandler();
    }

    const activeExecution = input.execution;
    return daemonScheduler.enqueue({
      sessionId,
      sliceId: activeExecution.sliceId,
      repoId: activeExecution.repoId,
      worktreeId: activeExecution.worktreeId,
      tool: input.name,
      kind: "repo_tool",
      priority: "interactive",
      writerId: activeExecution.warpWriterId,
    }, async () => runOffloadedRepoTool({
      name: input.name,
      parsed: input.parsed,
      execution: activeExecution,
      envelope: input.envelope,
      invocation: input.invocation,
      executeHandler,
    }));
  }

  async function emitInvocationCompleted(input: {
    readonly name: string;
    readonly invocation: InvocationStore;
    readonly execution: WorkspaceExecutionContext | null;
    readonly envelope: InvocationEnvelope;
  }): Promise<void> {
    if (!observability.enabled || input.invocation.response === undefined) {
      return;
    }
    const footprint = snapshotFootprint(input.invocation.footprint);
    await emitRuntimeEvent({
      event: "tool_call_completed",
      sessionId,
      traceId: input.envelope.traceId,
      seq: input.invocation.response.receipt.seq,
      tool: input.name,
      latencyMs: input.invocation.response.receipt.latencyMs,
      projection: input.invocation.response.receipt.projection,
      reason: input.invocation.response.receipt.reason,
      burdenKind: input.invocation.response.receipt.burden.kind,
      nonReadBurden: input.invocation.response.receipt.burden.nonRead,
      returnedBytes: input.invocation.response.receipt.returnedBytes,
      fileBytes: input.invocation.response.receipt.fileBytes,
      sessionDepth: input.execution?.governor.getGovernorDepth() ?? workspaceRouter.governor.getGovernorDepth(),
      tripwireSignals: input.invocation.response.tripwireSignals,
      metrics: input.invocation.response.receipt.cumulative,
      ...(footprint !== undefined ? { footprint } : {}),
    });
  }

  async function recordReadAttribution(input: {
    readonly name: string;
    readonly parsed: JsonObject;
    readonly result: McpToolResult;
    readonly execution: WorkspaceExecutionContext | null;
  }): Promise<void> {
    if (!workspaceRouter.isBound() || !attributedReadTools.has(input.name)) {
      return;
    }
    const payload = parseToolPayload(input.result);
    if (payload === null) {
      return;
    }
    await workspaceRouter.noteReadObservation(
      input.name as "safe_read" | "file_outline" | "read_range",
      input.parsed,
      payload,
      input.execution,
    );
  }

  async function emitInvocationFailed(input: {
    readonly name: string;
    readonly error: unknown;
    readonly envelope: InvocationEnvelope;
    readonly execution: WorkspaceExecutionContext | null;
  }): Promise<void> {
    if (!observability.enabled) return;
    const failure = classifyRuntimeFailure(input.error);
    await emitRuntimeEvent({
      event: "tool_call_failed",
      sessionId,
      traceId: input.envelope.traceId,
      tool: input.name,
      latencyMs: Date.now() - input.envelope.startedAtMs,
      sessionDepth: input.execution?.governor.getGovernorDepth() ?? workspaceRouter.governor.getGovernorDepth(),
      argKeys: input.envelope.argKeys,
      errorKind: failure.kind,
      errorName: failure.name,
    });
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
    const envelope = openInvocation(args);
    await emitInvocationStarted(name, envelope);
    const invocation = createInvocationStore(envelope);
    let execution: WorkspaceExecutionContext | null = null;

    try {
      const parsed = decodeInvocationArgs(args, schema);
      authorizeInvocation(name);
      execution = planInvocationExecution(name).execution;
      const result = await dispatchInvocation({
        name,
        parsed,
        handler,
        ctx,
        invocation,
        execution,
        envelope,
      });
      await emitInvocationCompleted({ name, invocation, execution, envelope });
      await recordReadAttribution({ name, parsed, result, execution });

      return result;
    } catch (error) {
      await emitInvocationFailed({ name, error, envelope, execution });
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
