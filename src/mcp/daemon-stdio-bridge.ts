import * as http from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  isInitializeRequest,
  isJSONRPCRequest,
  type JSONRPCMessage,
  type JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { defaultDaemonRoot, resolveSocketPath } from "./daemon-bootstrap.js";

const DEFAULT_READY_TIMEOUT_MS = 5_000;
const DEFAULT_POLL_INTERVAL_MS = 100;
const MCP_PATH = "/mcp";
const HEALTH_PATH = "/healthz";

function toNodeHeaders(headers: Headers): http.OutgoingHttpHeaders {
  const outgoing: http.OutgoingHttpHeaders = {};
  for (const [name, value] of headers.entries()) {
    outgoing[name] = value;
  }
  return outgoing;
}

function toResponseHeaders(headers: http.IncomingHttpHeaders): Headers {
  const responseHeaders = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        responseHeaders.append(name, item);
      }
      continue;
    }
    responseHeaders.append(name, value);
  }
  return responseHeaders;
}

export function createLocalSocketFetch(socketPath: string): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const body = request.body === null ? undefined : Buffer.from(await request.arrayBuffer());

    return await new Promise<Response>((resolvePromise, reject) => {
      const req = http.request({
        socketPath,
        path: `${url.pathname}${url.search}`,
        method: request.method,
        headers: toNodeHeaders(request.headers),
        signal: request.signal,
      }, (res) => {
        const bodyStream = Readable.toWeb(res) as ReadableStream<Uint8Array>;
        resolvePromise(new Response(bodyStream, {
          status: res.statusCode ?? 0,
          statusText: res.statusMessage ?? "",
          headers: toResponseHeaders(res.headers),
        }));
      });
      req.once("error", reject);
      if (body !== undefined && body.byteLength > 0) {
        req.write(body);
      }
      req.end();
    });
  };
}

async function isDaemonHealthy(socketPath: string): Promise<boolean> {
  try {
    const response = await createLocalSocketFetch(socketPath)(
      new URL(`http://graft${HEALTH_PATH}`),
      {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      },
    );
    await response.arrayBuffer();
    return response.ok;
  } catch {
    return false;
  }
}

function resolveGraftBinPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../bin/graft.js");
}

function spawnDaemonProcess(socketPath: string): ChildProcess {
  const child = spawn(
    process.execPath,
    [resolveGraftBinPath(), "daemon", "--socket", socketPath],
    {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
      windowsHide: true,
      env: { ...process.env },
    },
  );
  child.unref();
  return child;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms);
  });
}

export interface EnsureDaemonReadyOptions {
  socketPath?: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
  spawnIfMissing?: boolean;
  spawnDaemon?: ((socketPath: string) => ChildProcess | undefined) | undefined;
  healthCheck?: ((socketPath: string) => Promise<boolean>) | undefined;
}

export async function ensureDaemonReady(options: EnsureDaemonReadyOptions = {}): Promise<string> {
  const socketPath = resolveSocketPath(options.socketPath, defaultDaemonRoot());
  const timeoutMs = options.timeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const healthCheck = options.healthCheck ?? isDaemonHealthy;

  if (await healthCheck(socketPath)) {
    return socketPath;
  }

  if (options.spawnIfMissing === false) {
    throw new Error(
      `No graft daemon is listening on ${socketPath}. Start it with \`graft daemon --socket ${socketPath}\` or use repo-local \`graft serve\`.`,
    );
  }

  let spawnError: unknown;
  try {
    (options.spawnDaemon ?? spawnDaemonProcess)(socketPath);
  } catch (error) {
    spawnError = error;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (await healthCheck(socketPath)) {
      return socketPath;
    }
    await delay(pollIntervalMs);
  }

  const suffix = spawnError instanceof Error
    ? ` Auto-start failed: ${spawnError.message}`
    : "";
  throw new Error(`Timed out waiting for graft daemon readiness on ${socketPath}.${suffix}`);
}

function internalErrorResponse(
  message: JSONRPCRequest,
  error: unknown,
): JSONRPCMessage {
  return {
    jsonrpc: "2.0",
    id: message.id,
    error: {
      code: -32603,
      message: error instanceof Error ? error.message : String(error),
    },
  };
}

export interface StartDaemonBackedStdioBridgeOptions {
  socketPath?: string;
  spawnIfMissing?: boolean;
  ensureReady?: ((options?: EnsureDaemonReadyOptions) => Promise<string>) | undefined;
}

export async function startDaemonBackedStdioBridge(
  options: StartDaemonBackedStdioBridgeOptions = {},
): Promise<void> {
  const socketPath = await (options.ensureReady ?? ensureDaemonReady)({
    ...(options.socketPath !== undefined ? { socketPath: options.socketPath } : {}),
    ...(options.spawnIfMissing !== undefined ? { spawnIfMissing: options.spawnIfMissing } : {}),
  });
  const stdioTransport = new StdioServerTransport();
  const daemonTransport = new StreamableHTTPClientTransport(
    new URL(`http://graft${MCP_PATH}`),
    { fetch: createLocalSocketFetch(socketPath) },
  );

  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    process.stdin.off("end", onStdinEnd);
    process.stdin.off("close", onStdinEnd);
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await daemonTransport.terminateSession().catch(() => {
      return undefined;
    });
    await daemonTransport.close().catch(() => {
      return undefined;
    });
    await stdioTransport.close().catch(() => {
      return undefined;
    });
  };

  const onSignal = (): void => {
    void close().finally(() => {
      process.exitCode = process.exitCode ?? 0;
    });
  };
  const onStdinEnd = (): void => {
    void close();
  };

  stdioTransport.onmessage = (message): void => {
    if (isInitializeRequest(message)) {
      daemonTransport.setProtocolVersion(message.params.protocolVersion);
    }
    void daemonTransport.send(message).catch(async (error: unknown) => {
      if (!isJSONRPCRequest(message)) {
        console.error(error);
        return;
      }
      await stdioTransport.send(internalErrorResponse(message, error)).catch(() => {
        return undefined;
      });
    });
  };
  stdioTransport.onerror = (error): void => {
    console.error(error);
    void close();
  };
  daemonTransport.onmessage = (message): void => {
    void stdioTransport.send(message).catch((error: unknown) => {
      console.error(error);
      void close();
    });
  };
  daemonTransport.onerror = (error): void => {
    console.error(error);
  };
  daemonTransport.onclose = (): void => {
    void close();
  };

  process.stdin.on("end", onStdinEnd);
  process.stdin.on("close", onStdinEnd);
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  await daemonTransport.start();
  await stdioTransport.start();
}
