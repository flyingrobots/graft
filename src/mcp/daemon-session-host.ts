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
import type { DaemonSessionStorage } from "./daemon-storage-ownership.js";
import {
  MonotonicClock,
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
): Promise<DaemonSession> {
  const sessionGraftDir = path.join(options.graftDir, "sessions", newSessionId);
  let directoryReady = false;
  let transport: StreamableHTTPServerTransport | undefined;
  let server: GraftServer | undefined;
  let session: DaemonSession | undefined;
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
      activeRequests: 0,
    };
    const createdSession = session;
    createdTransport.onclose = () => {
      if (!construction.committed) {
        construction.closedBeforeCommit = true;
        return;
      }
      void terminateSession(createdSession, "transport_close");
    };
    createdTransport.onerror = () => {
      if (!construction.committed) {
        construction.closedBeforeCommit = true;
        return;
      }
      void terminateSession(createdSession, "transport_error");
    };

    await createdServer.getMcpServer().connect(createdTransport as Transport);
    if (construction.closedBeforeCommit) {
      throw new Error("MCP transport closed before daemon session construction committed");
    }
    options.controlPlane.registerTransport(
      newSessionId,
      () => createdServer.getWorkspaceStatus(),
      () => createdServer.getRuntimeCausalContext(),
    );
    sessions.set(newSessionId, session);
    construction.committed = true;
    return session;
  } catch (error) {
    if (session !== undefined && sessions.get(newSessionId) === session) {
      sessions.delete(newSessionId);
    }
    options.controlPlane.unregisterTransport(newSessionId);
    await server?.getMcpServer().close().catch(() => undefined);
    await transport?.close().catch(() => undefined);
    const rollbackErrors: unknown[] = [];
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
    const termination = Promise.resolve().then(async () => {
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
          retryable: true,
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
    session.termination = termination;
    return termination;
  }

  async function handleActiveSessionRequest(
    session: DaemonSession,
    handle: () => Promise<void>,
  ): Promise<void> {
    session.lastActivityAtMs = clock.read();
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
      session.lastActivityAtMs = clock.read();
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

  async function reapExpiredSessions(): Promise<SessionSweepResult> {
    const clockSample = clock.sample();
    if (!clockSample.ok) {
      return {
        sessionsRetired: 0,
        liveDirectoriesRemoved: 0,
        orphanDirectoriesRemoved: 0,
        cleanupFailures: [],
        sweepFailure: clockSample.failure,
      };
    }
    const current = clockSample.value;
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
        const result = await terminateSession(session, "idle");
        if (result.sessionRetired) sessionsRetired++;
        if (result.liveDirectoryRemoved) liveDirectoriesRemoved++;
        cleanupFailures.push(...result.cleanupFailures);
      }
    }

    let orphanDirectoriesRemoved = 0;
    try {
      const orphanResult = await options.sessionStorage.removeSessionOrphanDirectories(
        path.join(options.graftDir, "sessions"),
        new Set([...sessions.keys(), ...pendingSessionIds, ...retiredSessionIds]),
      );
      orphanDirectoriesRemoved = orphanResult.removed;
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
    }

    return {
      sessionsRetired,
      liveDirectoriesRemoved,
      orphanDirectoriesRemoved,
      cleanupFailures,
      sweepFailure: null,
    };
  }

  let reaperTimer: NodeJS.Timeout | null = null;
  if (reaperIntervalMs > 0) {
    reaperTimer = setInterval(() => {
      void reapExpiredSessions()
        .then((result) => {
          if (result.sweepFailure !== null) {
            console.error(`[graft] session reaper refused: ${JSON.stringify(result.sweepFailure)}`);
          }
          if (result.cleanupFailures.length > 0) {
            console.error(`[graft] session reaper cleanup failures: ${JSON.stringify(result.cleanupFailures)}`);
          }
        })
        .catch((error: unknown) => {
          console.error(`[graft] session reaper error: ${String(error)}`);
        });
    }, reaperIntervalMs);
    reaperTimer.unref();
  }

  return {
    async handleRequest(req, res): Promise<void> {
      try {
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
          const newSessionId = crypto.randomUUID();
          pendingSessionIds.add(newSessionId);
          let session: DaemonSession;
          try {
            session = await createDaemonSession(
              newSessionId,
              options,
              sessions,
              terminateSession,
              clock,
            );
          } finally {
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

    async close(): Promise<void> {
      if (reaperTimer !== null) {
        clearInterval(reaperTimer);
        reaperTimer = null;
      }
      const terminationResults = await Promise.all(
        [...sessions.values()].map((session) => terminateSession(session, "shutdown")),
      );
      const cleanupFailures = terminationResults.flatMap((result) => result.cleanupFailures);
      if (cleanupFailures.length > 0) {
        throw new AggregateError(
          cleanupFailures.map((failure) => Object.assign(new Error(failure.message), failure)),
          "Failed to clean up every daemon session during shutdown",
        );
      }
    },
  };
}
