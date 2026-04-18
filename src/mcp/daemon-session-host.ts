import * as crypto from "node:crypto";
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

interface DaemonSession {
  readonly id: string;
  readonly graftDir: string;
  readonly transport: StreamableHTTPServerTransport;
  readonly server: GraftServer;
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
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly runCapture?: Partial<RunCaptureConfig> | undefined;
  readonly runtimeObservability?: Partial<RuntimeObservabilityState> | undefined;
}

export interface DaemonSessionHost {
  handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
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
  });
  const session: DaemonSession = {
    id: newSessionId,
    graftDir: sessionGraftDir,
    transport,
    server,
  };
  transport.onclose = () => {
    sessions.delete(newSessionId);
    options.controlPlane.unregisterTransport(newSessionId);
  };
  transport.onerror = () => {
    sessions.delete(newSessionId);
    options.controlPlane.unregisterTransport(newSessionId);
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

          options.controlPlane.touchTransport(session.id);
          await session.transport.handleRequest(req, res, parsedBody);
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
          options.controlPlane.touchTransport(session.id);
          await session.transport.handleRequest(req, res);
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

    async close(): Promise<void> {
      for (const session of [...sessions.values()]) {
        options.controlPlane.unregisterTransport(session.id);
        await session.transport.close().catch(() => {
          return undefined;
        });
      }
      sessions.clear();
    },
  };
}
