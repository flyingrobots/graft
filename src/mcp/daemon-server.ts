import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as http from "node:http";
import * as net from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { CanonicalJsonCodec } from "../adapters/canonical-json.js";
import { nodeFs } from "../adapters/node-fs.js";
import { nodeGit } from "../adapters/node-git.js";
import { createGraftServer, type GraftServer } from "./server.js";
import { DaemonControlPlane, type DaemonStatusView } from "./daemon-control-plane.js";
import { DaemonJobScheduler } from "./daemon-job-scheduler.js";
import { ChildProcessDaemonWorkerPool } from "./daemon-worker-pool.js";
import { PersistentMonitorRuntime } from "./persistent-monitor-runtime.js";
import { InMemoryWarpPool } from "./warp-pool.js";
import { openWarp } from "../warp/open.js";
import type { RunCaptureConfig } from "./run-capture-config.js";
import type { RuntimeObservabilityState } from "./runtime-observability.js";

const HEALTH_PATH = "/healthz";
const MCP_PATH = "/mcp";
const DIRECTORY_MODE = 0o700;
const SOCKET_MODE = 0o600;
const MAX_BODY_BYTES = 1024 * 1024;

interface DaemonSession {
  readonly id: string;
  readonly graftDir: string;
  readonly transport: StreamableHTTPServerTransport;
  readonly server: GraftServer;
}

export type DaemonHealthStatus = DaemonStatusView;

export interface StartDaemonServerOptions {
  readonly socketPath?: string | undefined;
  readonly graftDir?: string | undefined;
  readonly env?: Readonly<Record<string, string | undefined>> | undefined;
  readonly runCapture?: Partial<RunCaptureConfig> | undefined;
  readonly runtimeObservability?: Partial<RuntimeObservabilityState> | undefined;
}

export interface GraftDaemonServer {
  readonly socketPath: string;
  readonly healthPath: typeof HEALTH_PATH;
  readonly mcpPath: typeof MCP_PATH;
  close(): Promise<void>;
  getHealthStatus(): DaemonHealthStatus;
}

function isNamedPipePath(socketPath: string): boolean {
  return process.platform === "win32" && socketPath.startsWith("\\\\.\\pipe\\");
}

function defaultDaemonRoot(): string {
  return path.join(os.homedir(), ".graft", "daemon");
}

function defaultSocketPath(graftDir: string): string {
  if (process.platform === "win32") {
    const digest = crypto.createHash("sha256").update(os.homedir()).digest("hex").slice(0, 12);
    return `\\\\.\\pipe\\graft-daemon-${digest}`;
  }
  return path.join(graftDir, "mcp.sock");
}

function resolveSocketPath(socketPath: string | undefined, graftDir: string): string {
  if (socketPath === undefined) return defaultSocketPath(graftDir);
  if (isNamedPipePath(socketPath)) return socketPath;
  return path.resolve(socketPath);
}

async function ensurePrivateDirectory(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true, mode: DIRECTORY_MODE });
  if (process.platform !== "win32") {
    await fs.chmod(dirPath, DIRECTORY_MODE).catch(() => {
      return undefined;
    });
  }
}

async function socketHasActiveListener(socketPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection({ path: socketPath });
    let settled = false;

    const finish = (result: boolean): void => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.once("connect", () => {
      finish(true);
    });
    socket.once("error", () => {
      finish(false);
    });
    socket.setTimeout(200, () => {
      finish(false);
    });
  });
}

async function prepareSocketPath(socketPath: string): Promise<void> {
  if (isNamedPipePath(socketPath)) return;
  await ensurePrivateDirectory(path.dirname(socketPath));
  const existing = await fs.lstat(socketPath).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (existing === null) return;
  if (!existing.isSocket()) {
    throw new Error(`Refusing to overwrite non-socket path: ${socketPath}`);
  }
  if (await socketHasActiveListener(socketPath)) {
    throw new Error(`A graft daemon is already listening on ${socketPath}`);
  }
  await fs.unlink(socketPath);
}

async function tightenSocketPermissions(socketPath: string): Promise<void> {
  if (process.platform === "win32" || isNamedPipePath(socketPath)) return;
  await fs.chmod(socketPath, SOCKET_MODE).catch(() => {
    return undefined;
  });
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

async function closeHttpServer(server: http.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

export async function startDaemonServer(options: StartDaemonServerOptions = {}): Promise<GraftDaemonServer> {
  const graftDir = path.resolve(options.graftDir ?? defaultDaemonRoot());
  const socketPath = resolveSocketPath(options.socketPath, graftDir);
  const warpPool = new InMemoryWarpPool((cwd) => openWarp({ cwd }));
  const controlPlane = new DaemonControlPlane({
    fs: nodeFs,
    codec: new CanonicalJsonCodec(),
    git: nodeGit,
    graftDir,
  });
  const daemonScheduler = new DaemonJobScheduler();
  const daemonWorkerPool = new ChildProcessDaemonWorkerPool();
  const monitorRuntime = new PersistentMonitorRuntime({
    fs: nodeFs,
    codec: new CanonicalJsonCodec(),
    git: nodeGit,
    graftDir,
    controlPlane,
    scheduler: daemonScheduler,
    workerPool: daemonWorkerPool,
  });
  const sessions = new Map<string, DaemonSession>();
  const startedAt = new Date().toISOString();
  const transportKind = isNamedPipePath(socketPath) ? "named_pipe" : "unix_socket";

  const getHealthStatus = (): DaemonHealthStatus => {
    return controlPlane.getStatus({
      transport: transportKind,
      sameUserOnly: true,
      socketPath,
      mcpPath: MCP_PATH,
      healthPath: HEALTH_PATH,
      activeWarpRepos: warpPool.size(),
      startedAt,
    }, monitorRuntime.getCounts(), daemonScheduler.getCounts(), daemonWorkerPool.getCounts());
  };

  await ensurePrivateDirectory(graftDir);
  await ensurePrivateDirectory(path.join(graftDir, "sessions"));
  await controlPlane.initialize();
  await monitorRuntime.initialize();
  await prepareSocketPath(socketPath);

  const handleRequest = async (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && url.pathname === HEALTH_PATH) {
        sendJson(res, 200, { ...getHealthStatus() });
        return;
      }

      if (url.pathname !== MCP_PATH) {
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
          const newSessionId = crypto.randomUUID();
          const sessionGraftDir = path.join(graftDir, "sessions", newSessionId);
          await ensurePrivateDirectory(sessionGraftDir);
          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => newSessionId,
          });
          const server = createGraftServer({
            mode: "daemon",
            sessionId: newSessionId,
            graftDir: sessionGraftDir,
            warpPool,
            daemonControlPlane: controlPlane,
            daemonScheduler,
            daemonWorkerPool,
            daemonRuntime: () => ({
              transport: transportKind,
              sameUserOnly: true,
              socketPath,
              mcpPath: MCP_PATH,
              healthPath: HEALTH_PATH,
              activeWarpRepos: warpPool.size(),
              startedAt,
            }),
            monitorRuntime,
            ...(options.env !== undefined ? { env: options.env } : {}),
            ...(options.runCapture !== undefined ? { runCapture: options.runCapture } : {}),
            ...(options.runtimeObservability !== undefined
              ? { runtimeObservability: options.runtimeObservability }
              : {}),
          });
          const createdSession: DaemonSession = {
            id: newSessionId,
            graftDir: sessionGraftDir,
            transport,
            server,
          };
          session = createdSession;
          transport.onclose = () => {
            sessions.delete(newSessionId);
            controlPlane.unregisterSession(newSessionId);
          };
          transport.onerror = () => {
            sessions.delete(newSessionId);
            controlPlane.unregisterSession(newSessionId);
          };
          sessions.set(newSessionId, createdSession);
          controlPlane.registerSession(
            newSessionId,
            () => server.getWorkspaceStatus(),
            () => server.getRuntimeCausalContext(),
          );
          await server.getMcpServer().connect(transport as Transport);
        }

        controlPlane.touchSession(session.id);
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
        controlPlane.touchSession(session.id);
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
  };

  const httpServer = http.createServer((req, res) => {
    void handleRequest(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      httpServer.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      httpServer.off("error", onError);
      resolve();
    };
    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen(socketPath);
  });
  await tightenSocketPermissions(socketPath);

  let closing: Promise<void> | null = null;

  const shutdown = (): void => {
    void daemon.close().finally(() => {
      process.exitCode = process.exitCode ?? 0;
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  const daemon: GraftDaemonServer = {
    socketPath,
    healthPath: HEALTH_PATH,
    mcpPath: MCP_PATH,
    getHealthStatus(): DaemonHealthStatus {
      return getHealthStatus();
    },
    async close(): Promise<void> {
      if (closing !== null) return closing;
      closing = (async () => {
        process.off("SIGINT", shutdown);
        process.off("SIGTERM", shutdown);
        for (const session of sessions.values()) {
          controlPlane.unregisterSession(session.id);
          await session.transport.close().catch(() => {
            return undefined;
          });
        }
        sessions.clear();
        await monitorRuntime.close();
        await daemonWorkerPool.close();
        await closeHttpServer(httpServer);
        if (!isNamedPipePath(socketPath)) {
          await fs.unlink(socketPath).catch(() => {
            return undefined;
          });
        }
      })();
      return closing;
    },
  };

  return daemon;
}
