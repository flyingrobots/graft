import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";
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

const MAX_BODY_BYTES = 1024 * 1024;
export const DEFAULT_SESSION_INACTIVITY_TTL_MS = 30 * 60 * 1000;
export const DEFAULT_SESSION_REAPER_INTERVAL_MS = 60 * 1000;

interface DaemonSession {
  readonly id: string;
  readonly graftDir: string;
  readonly transport: StreamableHTTPServerTransport;
  readonly server: GraftServer;
  lastActivityAtMs: number;
  activeRequests: number;
}

export interface CreateDaemonSessionHostOptions {
  readonly graftDir: string;
  readonly socketPath: string;
  readonly transportKind: "unix_socket" | "named_pipe";
  readonly healthPath: string;
  readonly mcpPath: string;
  readonly startedAt: string;
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
  reapExpiredSessions(): Promise<number>;
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

async function removeSessionDirectory(sessionGraftDir: string): Promise<void> {
  try {
    await fs.rm(sessionGraftDir, { recursive: true, force: true });
  } catch (error: unknown) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : undefined;
    if (code !== "ENOENT") {
      console.error(`[graft] failed to remove session directory ${sessionGraftDir}: ${String(error)}`);
    }
  }
}

async function createDaemonSession(
  newSessionId: string,
  options: CreateDaemonSessionHostOptions,
  sessions: Map<string, DaemonSession>,
): Promise<DaemonSession> {
  const sessionGraftDir = path.join(options.graftDir, "sessions", newSessionId);
  await ensurePrivateDirectory(sessionGraftDir);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => newSessionId,
  });
  const server = createGraftServer({
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
  const nowMs = options.nowMs ?? Date.now;
  const session: DaemonSession = {
    id: newSessionId,
    graftDir: sessionGraftDir,
    transport,
    server,
    lastActivityAtMs: nowMs(),
    activeRequests: 0,
  };
  transport.onclose = () => {
    sessions.delete(newSessionId);
    options.controlPlane.unregisterTransport(newSessionId);
    void removeSessionDirectory(sessionGraftDir);
  };
  transport.onerror = () => {
    sessions.delete(newSessionId);
    options.controlPlane.unregisterTransport(newSessionId);
    void removeSessionDirectory(sessionGraftDir);
  };
  sessions.set(newSessionId, session);
  options.controlPlane.registerTransport(
    newSessionId,
    () => server.getWorkspaceStatus(),
    () => server.getRuntimeCausalContext(),
  );
  await server.getMcpServer().connect(transport as Transport);
  return session;
}

export function createDaemonSessionHost(options: CreateDaemonSessionHostOptions): DaemonSessionHost {
  const sessions = new Map<string, DaemonSession>();
  const nowMs = options.nowMs ?? Date.now;
  const sessionTtlMs = options.sessionInactivityTtlMs ?? DEFAULT_SESSION_INACTIVITY_TTL_MS;
  const reaperIntervalMs = options.sessionReaperIntervalMs ?? DEFAULT_SESSION_REAPER_INTERVAL_MS;

  async function reapExpiredSessions(): Promise<number> {
    const current = nowMs();
    let reapedCount = 0;
    for (const [id, session] of [...sessions.entries()]) {
      if (session.activeRequests === 0 && current - session.lastActivityAtMs >= sessionTtlMs) {
        sessions.delete(id);
        options.controlPlane.unregisterTransport(id);
        await session.transport.close().catch(() => undefined);
        await removeSessionDirectory(session.graftDir);
        reapedCount++;
      }
    }
    return reapedCount;
  }

  let reaperTimer: NodeJS.Timeout | null = null;
  if (reaperIntervalMs > 0) {
    reaperTimer = setInterval(() => {
      void reapExpiredSessions().catch((error: unknown) => {
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
          const parsedBody = await readJsonBody(req);
          let session = sessionId !== undefined ? sessions.get(sessionId) : undefined;
          if (session === undefined) {
            if (sessionId !== undefined) {
              sendJsonRpcError(res, -32000, `Unknown MCP session: ${sessionId}`);
              return;
            }
            if (!isInitializeRequest(parsedBody)) {
              sendJsonRpcError(res, -32000, "Initialization requests must start a daemon session");
              return;
            }
            session = await createDaemonSession(crypto.randomUUID(), options, sessions);
          }

          session.lastActivityAtMs = nowMs();
          session.activeRequests++;
          options.controlPlane.touchTransport(session.id);
          try {
            await session.transport.handleRequest(req, res, parsedBody);
          } finally {
            session.activeRequests = Math.max(0, session.activeRequests - 1);
            session.lastActivityAtMs = nowMs();
          }
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
          session.lastActivityAtMs = nowMs();
          session.activeRequests++;
          options.controlPlane.touchTransport(session.id);
          try {
            await session.transport.handleRequest(req, res);
          } finally {
            session.activeRequests = Math.max(0, session.activeRequests - 1);
            session.lastActivityAtMs = nowMs();
          }
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
      for (const session of [...sessions.values()]) {
        options.controlPlane.unregisterTransport(session.id);
        await session.transport.close().catch(() => {
          return undefined;
        });
        await removeSessionDirectory(session.graftDir);
      }
      sessions.clear();
    },
  };
}
