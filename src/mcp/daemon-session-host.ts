import * as crypto from "node:crypto";
import * as http from "node:http";
import * as path from "node:path";
import { performance } from "node:perf_hooks";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createGraftServer, type GraftServer } from "./server.js";
import type { DaemonControlPlane, DaemonStatusView } from "./daemon-control-plane.js";
import type { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import type { ChildProcessDaemonWorkerPool } from "./daemon-worker-pool.js";
import type { PersistentMonitorRuntime } from "./persistent-monitor-runtime.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import type { RuntimeObservabilityState } from "./runtime-observability.js";
import type { WarpPool } from "./warp-pool.js";
import { ensurePrivateDirectory } from "./daemon-bootstrap.js";
import type {
  DaemonSessionStorage,
  LegacyUnmarkedSessionPolicy,
  SessionOrphanPreservedEntry,
} from "./daemon-storage-ownership.js";
import {
  UnsafeDaemonSessionDirectoryError,
  UnsafeDaemonSessionsRootError,
} from "./daemon-storage-ownership.js";
import {
  MonotonicClock,
  MonotonicClockSampleError,
  type MonotonicClockFailure,
} from "./daemon-monotonic-clock.js";

const MAX_BODY_BYTES = 1024 * 1024;
export const DEFAULT_SESSION_INACTIVITY_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_SESSION_REAPER_INTERVAL_MS = 60 * 1000;
const MAX_NODE_TIMER_DELAY_MS = 2_147_483_647;

export type SessionCleanupFailureCode =
  | "SESSION_PROTOCOL_CLOSE_FAILED"
  | "SESSION_TRANSPORT_CLOSE_FAILED"
  | "SESSION_DIRECTORY_REMOVE_FAILED"
  | "ORPHAN_DIRECTORY_REMOVE_FAILED"
  | "ORPHAN_SCAN_FAILED";

export interface SessionCleanupFailure {
  readonly code: SessionCleanupFailureCode;
  readonly sessionId: string | null;
  readonly path: string | null;
  readonly retryable: boolean;
  readonly message: string;
}

export interface SessionSweepResult {
  readonly sessionsRetired: number;
  readonly liveDirectoriesRemoved: number;
  readonly orphanDirectoriesRemoved: number;
  readonly cleanupFailures: readonly SessionCleanupFailure[];
  readonly preservedEntries: readonly SessionOrphanPreservedEntry[];
  readonly sweepFailure: MonotonicClockFailure | null;
}

interface SessionTerminationResult {
  readonly sessionRetired: boolean;
  readonly liveDirectoryRemoved: boolean;
  readonly cleanupFailures: readonly SessionCleanupFailure[];
}

function monotonicNowMs(): number {
  return performance.now();
}

function cleanupFailure(input: {
  readonly code: SessionCleanupFailureCode;
  readonly sessionId: string | null;
  readonly path: string | null;
  readonly retryable: boolean;
  readonly error: unknown;
}): SessionCleanupFailure {
  return {
    code: input.code,
    sessionId: input.sessionId,
    path: input.path,
    retryable: input.retryable,
    message: input.error instanceof Error ? input.error.message : String(input.error),
  };
}

export function resolveSessionInactivityTtlMs(value: number | undefined): number {
  const resolved = value ?? DEFAULT_SESSION_INACTIVITY_TTL_MS;
  if (!Number.isSafeInteger(resolved) || resolved <= 0) {
    throw new RangeError("sessionInactivityTtlMs must be a positive safe integer");
  }
  return resolved;
}

export function resolveSessionReaperIntervalMs(value: number | undefined): number {
  const resolved = value ?? DEFAULT_SESSION_REAPER_INTERVAL_MS;
  if (!Number.isInteger(resolved) || resolved < 0 || resolved > MAX_NODE_TIMER_DELAY_MS) {
    throw new RangeError(
      `sessionReaperIntervalMs must be zero or an integer no greater than ${String(MAX_NODE_TIMER_DELAY_MS)}`,
    );
  }
  return resolved;
}

interface DaemonSession {
  readonly id: string;
  readonly graftDir: string;
  readonly transport: StreamableHTTPServerTransport;
  readonly server: GraftServer;
  state: "open" | "terminating" | "terminated";
  termination: Promise<SessionTerminationResult> | null;
  lastActivityAtMs: number;
  activityClockFailure: MonotonicClockFailure | null;
  activeRequests: number;
}

type SessionTerminationReason = "idle" | "shutdown" | "transport_close" | "transport_error";
type TerminateDaemonSession = (
  session: DaemonSession,
  reason: SessionTerminationReason,
) => Promise<SessionTerminationResult>;

export interface CreateDaemonSessionHostOptions {
  readonly graftDir: string;
  readonly daemonInstanceId: string;
  readonly socketPath: string;
  readonly transportKind: "unix_socket" | "named_pipe";
  readonly healthPath: string;
  readonly mcpPath: string;
  readonly startedAt: string;
  readonly sessionStorage: DaemonSessionStorage;
  readonly legacyUnmarkedSessionPolicy: LegacyUnmarkedSessionPolicy;
  readonly warpPool: WarpPool;
  readonly controlPlane: DaemonControlPlane;
  readonly daemonScheduler: DaemonJobScheduler;
  readonly daemonWorkerPool: ChildProcessDaemonWorkerPool;
  readonly monitorRuntime: PersistentMonitorRuntime;
  readonly getHealthStatus: () => DaemonStatusView;
  readonly sessionInactivityTtlMs?: number | undefined;
  readonly sessionReaperIntervalMs?: number | undefined;
  readonly nowMs?: (() => number) | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly runCapture?: Partial<RunCaptureConfig> | undefined;
  readonly runtimeObservability?: Partial<RuntimeObservabilityState> | undefined;
  readonly persistedLocalHistoryGraph?: boolean | undefined;
}

export interface DaemonSessionHost {
  handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
  reapExpiredSessions(): Promise<SessionSweepResult>;
  close(): Promise<void>;
}

export class DaemonSessionHostClosedError extends Error {
  readonly code = "DAEMON_SESSION_HOST_CLOSED";

  constructor() {
    super("Daemon session host is closing or closed");
    this.name = "DaemonSessionHostClosedError";
  }
}

function getHeader(req: http.IncomingMessage, name: string): string | undefined {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf-8") : chunk;
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error(`Request body exceeds ${String(MAX_BODY_BYTES)} bytes`);
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf-8")) as unknown;
}

function sendJson(res: http.ServerResponse, statusCode: number, body: Record<string, unknown>): void {
  if (res.headersSent) return;
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function sendJsonRpcError(res: http.ServerResponse, code: number, message: string): void {
  sendJson(res, code === -32700 ? 400 : 500, {
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
}

async function createDaemonSession(
  newSessionId: string,
  options: CreateDaemonSessionHostOptions,
  sessions: Map<string, DaemonSession>,
  terminateSession: TerminateDaemonSession,
  clock: MonotonicClock,
  canCommit: () => boolean,
): Promise<DaemonSession> {
  const sessionGraftDir = path.join(options.graftDir, "sessions", newSessionId);
  let directoryReady = false;
  let transport: StreamableHTTPServerTransport | undefined;
  let server: GraftServer | undefined;
  let session: DaemonSession | undefined;
  let protocolConnectionAttempted = false;
  const construction = {
    committed: false,
    closedBeforeCommit: false,
  };
  try {
    await ensurePrivateDirectory(sessionGraftDir);
    directoryReady = true;
    await options.sessionStorage.writeSessionOwnershipMarker(
      sessionGraftDir,
      options.daemonInstanceId,
      newSessionId,
    );
    const createdTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });
    transport = createdTransport;
    const createdServer = createGraftServer({
      mode: "daemon",
      sessionId: newSessionId,
      graftDir: sessionGraftDir,
      warpPool: options.warpPool,
      daemonControlPlane: options.controlPlane,
      daemonScheduler: options.daemonScheduler,
      daemonWorkerPool: options.daemonWorkerPool,
      daemonRuntime: () => ({
        transport: options.transportKind,
        sameUserOnly: true,
        socketPath: options.socketPath,
        mcpPath: options.mcpPath,
        healthPath: options.healthPath,
        activeWarpRepos: options.warpPool.size(),
        startedAt: options.startedAt,
      }),
      monitorRuntime: options.monitorRuntime,
      ...(options.env !== undefined ? { env: options.env } : {}),
      ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
      ...(options.runtimeObservability !== undefined
        ? { runtimeObservability: options.runtimeObservability }
        : {}),
      ...(options.persistedLocalHistoryGraph !== undefined
        ? { persistedLocalHistoryGraph: options.persistedLocalHistoryGraph }
        : {}),
    });
    server = createdServer;
    session = {
      id: newSessionId,
      graftDir: sessionGraftDir,
      transport: createdTransport,
      server: createdServer,
      state: "open",
      termination: null,
      lastActivityAtMs: clock.read(),
      activityClockFailure: null,
      activeRequests: 0,
    };
    const createdSession = session;
    const terminateFromTransport = (reason: "transport_close" | "transport_error"): void => {
      const initiatedTermination = createdSession.termination === null;
      const termination = terminateSession(createdSession, reason);
      if (!initiatedTermination) return;
      void termination.then(
        (result) => {
          if (result.cleanupFailures.length === 0) return;
          console.error(
            `[graft] daemon session termination cleanup failures: ${JSON.stringify({
              reason,
              sessionId: createdSession.id,
              cleanupFailures: result.cleanupFailures,
            })}`,
          );
        },
        (error: unknown) => {
          console.error(
            `[graft] daemon session termination error: ${JSON.stringify({
              reason,
              sessionId: createdSession.id,
              message: error instanceof Error ? error.message : String(error),
            })}`,
          );
        },
      );
    };
    createdTransport.onclose = () => {
      if (!construction.committed) {
        construction.closedBeforeCommit = true;
        return;
      }
      terminateFromTransport("transport_close");
    };
    createdTransport.onerror = () => {
      if (!construction.committed) {
        construction.closedBeforeCommit = true;
        return;
      }
      terminateFromTransport("transport_error");
    };

    protocolConnectionAttempted = true;
    await createdServer.getMcpServer().connect(createdTransport as Transport);
    if (construction.closedBeforeCommit) {
      throw new Error("MCP transport closed before daemon session construction committed");
    }
    if (!canCommit()) throw new DaemonSessionHostClosedError();
    options.controlPlane.registerTransport(
      newSessionId,
      () => createdServer.getWorkspaceStatus(),
      () => createdServer.getRuntimeCausalContext(),
    );
    sessions.set(newSessionId, session);
    construction.committed = true;
    return session;
  } catch (error) {
    const rollbackErrors: unknown[] = [];
    if (session !== undefined && sessions.get(newSessionId) === session) {
      sessions.delete(newSessionId);
    }
    try {
      options.controlPlane.unregisterTransport(newSessionId);
    } catch (cleanupError) {
      rollbackErrors.push(cleanupError);
    }
    let protocolCloseFailed = false;
    if (server !== undefined) {
      try {
        await server.getMcpServer().close();
      } catch (protocolCloseError) {
        protocolCloseFailed = true;
        rollbackErrors.push(protocolCloseError);
      }
    }
    if (
      transport !== undefined
      && (!protocolConnectionAttempted || protocolCloseFailed)
    ) {
      try {
        await transport.close();
      } catch (transportCloseError) {
        rollbackErrors.push(transportCloseError);
      }
    }
    if (directoryReady) {
      try {
        await options.sessionStorage.removeSessionDirectory(sessionGraftDir);
      } catch (cleanupError) {
        rollbackErrors.push(cleanupError);
      }
    }
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "Daemon session construction and scratch rollback both failed",
        { cause: error },
      );
    }
    throw error;
  }
}

export function createDaemonSessionHost(options: CreateDaemonSessionHostOptions): DaemonSessionHost {
  const sessions = new Map<string, DaemonSession>();
  const pendingSessionIds = new Set<string>();
  const terminatingSessionIds = new Set<string>();
  const terminationsInFlight = new Set<Promise<SessionTerminationResult>>();
  const sweepOwnedTerminations = new Set<Promise<SessionTerminationResult>>();
  const pendingSessionConstructions = new Set<Promise<DaemonSession>>();
  let orphanScanProtectedSessionIds: Set<string> | null = null;
  let shutdownTerminationCollector: Set<Promise<SessionTerminationResult>> | null = null;
  let hostState: "open" | "closing" | "closed" = "open";
  const hostIsOpen = (): boolean => hostState === "open";
  const clock = new MonotonicClock(options.nowMs ?? monotonicNowMs);
  const sessionTtlMs = resolveSessionInactivityTtlMs(options.sessionInactivityTtlMs);
  const reaperIntervalMs = resolveSessionReaperIntervalMs(options.sessionReaperIntervalMs);

  function terminateSession(
    session: DaemonSession,
    reason: SessionTerminationReason,
  ): Promise<SessionTerminationResult> {
    if (session.termination !== null) return session.termination;
    if (sessions.get(session.id) !== session) {
      session.state = "terminated";
      session.termination = Promise.resolve({
        sessionRetired: false,
        liveDirectoryRemoved: false,
        cleanupFailures: [],
      });
      return session.termination;
    }

    session.state = "terminating";
    sessions.delete(session.id);
    terminatingSessionIds.add(session.id);
    const operation = Promise.resolve().then(async () => {
      const cleanupFailures: SessionCleanupFailure[] = [];
      options.controlPlane.unregisterTransport(session.id);
      if (reason !== "transport_close") {
        try {
          await session.server.getMcpServer().close();
        } catch (protocolError) {
          cleanupFailures.push(cleanupFailure({
            code: "SESSION_PROTOCOL_CLOSE_FAILED",
            sessionId: session.id,
            path: null,
            retryable: false,
            error: protocolError,
          }));
          try {
            await session.transport.close();
          } catch (transportError) {
            cleanupFailures.push(cleanupFailure({
              code: "SESSION_TRANSPORT_CLOSE_FAILED",
              sessionId: session.id,
              path: null,
              retryable: false,
              error: transportError,
            }));
          }
        }
      }
      let liveDirectoryRemoved = false;
      try {
        liveDirectoryRemoved = await options.sessionStorage.removeSessionDirectory(session.graftDir);
      } catch (error) {
        cleanupFailures.push(cleanupFailure({
          code: "SESSION_DIRECTORY_REMOVE_FAILED",
          sessionId: session.id,
          path: session.graftDir,
          retryable: !(
            error instanceof UnsafeDaemonSessionDirectoryError
            || error instanceof UnsafeDaemonSessionsRootError
          ),
          error,
        }));
      }
      session.state = "terminated";
      return {
        sessionRetired: true,
        liveDirectoryRemoved,
        cleanupFailures,
      };
    });
    const termination = operation.finally(() => {
      terminatingSessionIds.delete(session.id);
      terminationsInFlight.delete(termination);
    });
    session.termination = termination;
    terminationsInFlight.add(termination);
    shutdownTerminationCollector?.add(termination);
    return termination;
  }

  async function handleActiveSessionRequest(
    session: DaemonSession,
    handle: () => Promise<void>,
  ): Promise<void> {
    try {
      session.lastActivityAtMs = clock.read();
      session.activityClockFailure = null;
    } catch (error) {
      if (error instanceof MonotonicClockSampleError) {
        session.activityClockFailure = error.failure;
      }
      throw error;
    }
    session.activeRequests++;
    options.controlPlane.touchTransport(session.id);
    let requestFailure: { readonly error: unknown } | null = null;
    try {
      await handle();
    } catch (error) {
      requestFailure = { error };
    }
    let settlementFailure: { readonly error: unknown } | null = null;
    try {
      if (session.activeRequests <= 0) {
        throw new Error(`Daemon session request reference underflow: ${session.id}`);
      }
      session.activeRequests--;
      try {
        session.lastActivityAtMs = clock.read();
        session.activityClockFailure = null;
      } catch (error) {
        if (error instanceof MonotonicClockSampleError) {
          session.activityClockFailure = error.failure;
        }
        throw error;
      }
      options.controlPlane.touchTransport(session.id);
    } catch (error) {
      settlementFailure = { error };
    }
    if (requestFailure !== null && settlementFailure !== null) {
      throw new AggregateError(
        [requestFailure.error, settlementFailure.error],
        "Daemon session request and settlement both failed",
        { cause: requestFailure.error },
      );
    }
    if (requestFailure !== null) throw requestFailure.error;
    if (settlementFailure !== null) throw settlementFailure.error;
  }

  async function runSessionSweep(): Promise<SessionSweepResult> {
    const clockSample = clock.sample();
    if (!clockSample.ok) {
      return {
        sessionsRetired: 0,
        liveDirectoriesRemoved: 0,
        orphanDirectoriesRemoved: 0,
        cleanupFailures: [],
        preservedEntries: [],
        sweepFailure: clockSample.failure,
      };
    }
    const current = clockSample.value;
    const sessionNeedingClockRebase = [...sessions.values()].find((session) => {
      return session.state === "open"
        && session.activeRequests === 0
        && session.activityClockFailure !== null;
    });
    if (sessionNeedingClockRebase !== undefined) {
      const sweepFailure = sessionNeedingClockRebase.activityClockFailure;
      if (sweepFailure === null) {
        throw new Error("Daemon session clock rebase invariant violated");
      }
      sessionNeedingClockRebase.lastActivityAtMs = current;
      sessionNeedingClockRebase.activityClockFailure = null;
      return {
        sessionsRetired: 0,
        liveDirectoriesRemoved: 0,
        orphanDirectoriesRemoved: 0,
        cleanupFailures: [],
        preservedEntries: [],
        sweepFailure,
      };
    }
    const retiredSessionIds = new Set<string>();
    let sessionsRetired = 0;
    let liveDirectoriesRemoved = 0;
    const cleanupFailures: SessionCleanupFailure[] = [];
    for (const session of [...sessions.values()]) {
      if (
        session.state === "open"
        && session.activeRequests === 0
        && current - session.lastActivityAtMs >= sessionTtlMs
      ) {
        retiredSessionIds.add(session.id);
        const termination = terminateSession(session, "idle");
        sweepOwnedTerminations.add(termination);
        shutdownTerminationCollector?.delete(termination);
        let result: SessionTerminationResult;
        try {
          result = await termination;
        } finally {
          sweepOwnedTerminations.delete(termination);
        }
        if (result.sessionRetired) sessionsRetired++;
        if (result.liveDirectoryRemoved) liveDirectoriesRemoved++;
        cleanupFailures.push(...result.cleanupFailures);
      }
    }

    let orphanDirectoriesRemoved = 0;
    let preservedEntries: readonly SessionOrphanPreservedEntry[] = [];
    const protectedSessionIds = new Set([
      ...sessions.keys(),
      ...pendingSessionIds,
      ...terminatingSessionIds,
      ...retiredSessionIds,
    ]);
    orphanScanProtectedSessionIds = protectedSessionIds;
    try {
      const orphanResult = await options.sessionStorage.removeSessionOrphanDirectories(
        path.join(options.graftDir, "sessions"),
        protectedSessionIds,
        options.legacyUnmarkedSessionPolicy,
      );
      orphanDirectoriesRemoved = orphanResult.removed;
      preservedEntries = orphanResult.preservedEntries;
      cleanupFailures.push(...orphanResult.failures.map((failure) => cleanupFailure({
        code: "ORPHAN_DIRECTORY_REMOVE_FAILED",
        sessionId: failure.sessionId,
        path: failure.path,
        retryable: true,
        error: failure.error,
      })));
    } catch (error) {
      cleanupFailures.push(cleanupFailure({
        code: "ORPHAN_SCAN_FAILED",
        sessionId: null,
        path: path.join(options.graftDir, "sessions"),
        retryable: true,
        error,
      }));
    } finally {
      if (orphanScanProtectedSessionIds === protectedSessionIds) {
        orphanScanProtectedSessionIds = null;
      }
    }

    return {
      sessionsRetired,
      liveDirectoriesRemoved,
      orphanDirectoriesRemoved,
      cleanupFailures,
      preservedEntries,
      sweepFailure: null,
    };
  }

  let sweepInFlight: Promise<SessionSweepResult> | null = null;
  function reapExpiredSessions(): Promise<SessionSweepResult> {
    if (!hostIsOpen()) {
      return Promise.reject(new DaemonSessionHostClosedError());
    }
    if (sweepInFlight !== null) return sweepInFlight;

    const operation = runSessionSweep();
    const tracked = operation.finally(() => {
      if (sweepInFlight === tracked) sweepInFlight = null;
    });
    sweepInFlight = tracked;
    return tracked;
  }

  let scheduledSweepPending = false;
  let reaperTimer: NodeJS.Timeout | null = null;
  if (reaperIntervalMs > 0) {
    reaperTimer = setInterval(() => {
      if (scheduledSweepPending) return;
      scheduledSweepPending = true;
      void reapExpiredSessions()
        .then((result) => {
          if (result.sweepFailure !== null) {
            console.error(`[graft] session reaper refused: ${JSON.stringify(result.sweepFailure)}`);
          }
          if (result.cleanupFailures.length > 0) {
            console.error(`[graft] session reaper cleanup failures: ${JSON.stringify(result.cleanupFailures)}`);
          }
          if (result.preservedEntries.length > 0) {
            console.error(`[graft] session reaper preserved entries: ${JSON.stringify(result.preservedEntries)}`);
          }
        })
        .catch((error: unknown) => {
          console.error(`[graft] session reaper error: ${String(error)}`);
        })
        .finally(() => {
          scheduledSweepPending = false;
        });
    }, reaperIntervalMs);
    reaperTimer.unref();
  }

  let closeInFlight: Promise<void> | null = null;
  function closeHost(): Promise<void> {
    if (closeInFlight !== null) return closeInFlight;
    hostState = "closing";
    if (reaperTimer !== null) {
      clearInterval(reaperTimer);
      reaperTimer = null;
    }
    const constructionsAtClose = [...pendingSessionConstructions];
    const sweepAtClose = sweepInFlight;
    const terminationsAtClose = new Set(
      [...terminationsInFlight].filter((termination) => !sweepOwnedTerminations.has(termination)),
    );
    shutdownTerminationCollector = terminationsAtClose;
    const operation = (async () => {
      const errors: unknown[] = [];
      const [constructionResults, sweepResults] = await Promise.all([
        Promise.allSettled(constructionsAtClose),
        sweepAtClose === null ? Promise.resolve([]) : Promise.allSettled([sweepAtClose]),
      ]);
      for (const result of constructionResults) {
        if (result.status === "rejected" && !(result.reason instanceof DaemonSessionHostClosedError)) {
          errors.push(result.reason);
        }
      }
      for (const result of sweepResults) {
        if (result.status === "rejected") {
          errors.push(result.reason);
          continue;
        }
        errors.push(...result.value.cleanupFailures.map(
          (failure) => Object.assign(new Error(failure.message), failure),
        ));
      }

      for (const session of [...sessions.values()]) {
        terminationsAtClose.add(terminateSession(session, "shutdown"));
      }
      const terminationResults = await Promise.allSettled([...terminationsAtClose]);
      for (const result of terminationResults) {
        if (result.status === "rejected") {
          errors.push(result.reason);
          continue;
        }
        errors.push(...result.value.cleanupFailures.map(
          (failure) => Object.assign(new Error(failure.message), failure),
        ));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, "Failed to clean up every daemon session during shutdown");
      }
    })();
    closeInFlight = operation.finally(() => {
      shutdownTerminationCollector = null;
      hostState = "closed";
    });
    return closeInFlight;
  }

  return {
    async handleRequest(req, res): Promise<void> {
      try {
        if (!hostIsOpen()) {
          sendJson(res, 503, { error: "Daemon session host is closing" });
          return;
        }
        const url = new URL(req.url ?? "/", "http://localhost");
        if (req.method === "GET" && url.pathname === options.healthPath) {
          sendJson(res, 200, { ...options.getHealthStatus() });
          return;
        }

        if (url.pathname !== options.mcpPath) {
          sendJson(res, 404, { error: "Not found" });
          return;
        }

        const sessionId = getHeader(req, "mcp-session-id");

        if (req.method === "POST") {
          if (sessionId !== undefined) {
            const session = sessions.get(sessionId);
            if (session === undefined) {
              sendJsonRpcError(res, -32000, `Unknown MCP session: ${sessionId}`);
              return;
            }
            await handleActiveSessionRequest(session, async () => {
              const parsedBody = await readJsonBody(req);
              await session.transport.handleRequest(req, res, parsedBody);
            });
            return;
          }

          const parsedBody = await readJsonBody(req);
          if (!isInitializeRequest(parsedBody)) {
            sendJsonRpcError(res, -32000, "Initialization requests must start a daemon session");
            return;
          }
          if (!hostIsOpen()) throw new DaemonSessionHostClosedError();
          const newSessionId = crypto.randomUUID();
          if (
            sessions.has(newSessionId)
            || pendingSessionIds.has(newSessionId)
            || terminatingSessionIds.has(newSessionId)
          ) {
            throw new Error(`Generated MCP session identity is already reserved: ${newSessionId}`);
          }
          pendingSessionIds.add(newSessionId);
          orphanScanProtectedSessionIds?.add(newSessionId);
          const construction = createDaemonSession(
            newSessionId,
            options,
            sessions,
            terminateSession,
            clock,
            hostIsOpen,
          );
          pendingSessionConstructions.add(construction);
          let session: DaemonSession;
          try {
            session = await construction;
          } finally {
            pendingSessionConstructions.delete(construction);
            pendingSessionIds.delete(newSessionId);
          }
          await handleActiveSessionRequest(session, async () => {
            await session.transport.handleRequest(req, res, parsedBody);
          });
          return;
        }

        if (req.method === "GET" || req.method === "DELETE") {
          if (sessionId === undefined) {
            sendJson(res, 400, { error: "Missing MCP session header" });
            return;
          }
          const session = sessions.get(sessionId);
          if (session === undefined) {
            sendJson(res, 404, { error: `Unknown MCP session: ${sessionId}` });
            return;
          }
          await handleActiveSessionRequest(session, async () => {
            await session.transport.handleRequest(req, res);
          });
          return;
        }

        sendJson(res, 405, { error: "Method not allowed" });
      } catch (error) {
        if (error instanceof SyntaxError) {
          sendJsonRpcError(res, -32700, "Invalid JSON");
          return;
        }
        sendJsonRpcError(res, -32603, error instanceof Error ? error.message : String(error));
      }
    },

    reapExpiredSessions,
    close: closeHost,
  };
}
